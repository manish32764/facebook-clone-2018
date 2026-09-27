package com.facebookclone.service;

import com.facebookclone.dto.ListingDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.Listing;
import com.facebookclone.entity.Notification;
import com.facebookclone.entity.SavedListing;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.ListingRepository;
import com.facebookclone.repository.SavedListingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MarketplaceService {

    /** The category strip across the top of Marketplace. */
    public static final List<String> CATEGORIES = List.of(
            "Vehicles", "Property Rentals", "Electronics", "Home & Garden",
            "Clothing", "Hobbies", "Musical Instruments", "Free Stuff");

    private final ListingRepository listingRepository;
    private final SavedListingRepository savedListingRepository;
    private final UserService userService;
    private final ViewerScopeService scopeService;
    private final NotificationService notificationService;

    /**
     * Browsing with filters. The catalogue is small enough that filtering and
     * sorting in memory keeps the query simple and every filter optional.
     */
    @Transactional(readOnly = true)
    public List<ListingDto> browse(ListingFilter filter, Long viewerId) {
        String category = filter.category() == null || filter.category().isBlank() ? null : filter.category().trim();
        Set<Long> hidden = scopeService.hiddenIds(viewerId);

        Stream<Listing> stream = listingRepository.findAvailable(category).stream()
                .filter(l -> !hidden.contains(l.getSeller().getId()));

        if (filter.query() != null && !filter.query().isBlank()) {
            String needle = filter.query().trim().toLowerCase();
            stream = stream.filter(l -> l.getTitle().toLowerCase().contains(needle)
                    || (l.getDescription() != null && l.getDescription().toLowerCase().contains(needle)));
        }
        if (filter.minPrice() != null) stream = stream.filter(l -> l.getPrice().compareTo(filter.minPrice()) >= 0);
        if (filter.maxPrice() != null) stream = stream.filter(l -> l.getPrice().compareTo(filter.maxPrice()) <= 0);
        if (filter.location() != null && !filter.location().isBlank()) {
            String place = filter.location().trim().toLowerCase();
            stream = stream.filter(l -> l.getLocation() != null && l.getLocation().toLowerCase().contains(place));
        }
        if (filter.condition() != null && !filter.condition().isBlank()) {
            stream = stream.filter(l -> l.getCondition().name().equalsIgnoreCase(filter.condition().trim()));
        }

        Comparator<Listing> order = switch (filter.sort() == null ? "" : filter.sort()) {
            case "price_asc" -> Comparator.comparing(Listing::getPrice);
            case "price_desc" -> Comparator.comparing(Listing::getPrice).reversed();
            default -> Comparator.comparing(Listing::getCreatedAt).reversed();
        };

        List<Listing> listings = stream.sorted(order).toList();
        Set<Long> saved = new HashSet<>(savedListingRepository.findListingIds(viewerId));
        return listings.stream().map(l -> toDto(l, viewerId, saved)).toList();
    }

    @Transactional(readOnly = true)
    public List<ListingDto> bySeller(Long sellerId, Long viewerId) {
        Set<Long> saved = new HashSet<>(savedListingRepository.findListingIds(viewerId));
        return listingRepository.findBySeller(sellerId).stream().map(l -> toDto(l, viewerId, saved)).toList();
    }

    /** Saved items, most recently saved first. */
    @Transactional(readOnly = true)
    public List<ListingDto> saved(Long viewerId) {
        List<Long> ids = savedListingRepository.findListingIds(viewerId);
        if (ids.isEmpty()) return List.of();
        Map<Long, Listing> byId = new HashMap<>();
        listingRepository.findAllById(ids).forEach(l -> byId.put(l.getId(), l));
        Set<Long> saved = new HashSet<>(ids);
        return ids.stream().map(byId::get).filter(Objects::nonNull).map(l -> toDto(l, viewerId, saved)).toList();
    }

    @Transactional(readOnly = true)
    public ListingDto one(Long listingId, Long viewerId) {
        Listing listing = require(listingId);
        scopeService.requireNotBlocked(viewerId, listing.getSeller().getId());
        return toDto(listing, viewerId, new HashSet<>(savedListingRepository.findListingIds(viewerId)));
    }

    @Transactional(readOnly = true)
    public List<ListingDto> search(String query, Long viewerId) {
        if (query == null || query.trim().length() < 2) return List.of();
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        Set<Long> saved = new HashSet<>(savedListingRepository.findListingIds(viewerId));
        return listingRepository.search(query.trim()).stream()
                .filter(l -> !hidden.contains(l.getSeller().getId()))
                .map(l -> toDto(l, viewerId, saved)).toList();
    }

    @Transactional
    public ListingDto create(Long sellerId, CreateListingRequest req) {
        User seller = userService.require(sellerId);
        Listing listing = listingRepository.save(Listing.builder()
                .seller(seller)
                .title(req.title().trim())
                .description(req.description() == null ? null : req.description().trim())
                .price(req.price())
                .currency(req.currency() == null || req.currency().isBlank() ? "USD" : req.currency().trim())
                .category(req.category().trim())
                .location(blankToNull(req.location()))
                .imageUrl(blankToNull(req.imageUrl()))
                .condition(parseCondition(req.condition()))
                .build());
        return toDto(listing, sellerId, Set.of());
    }

    @Transactional
    public ListingDto update(Long listingId, Long userId, UpdateListingRequest req) {
        Listing listing = requireOwn(listingId, userId);
        if (req.title() != null && !req.title().isBlank()) listing.setTitle(req.title().trim());
        if (req.description() != null) listing.setDescription(blankToNull(req.description()));
        if (req.price() != null) listing.setPrice(req.price());
        if (req.category() != null && !req.category().isBlank()) listing.setCategory(req.category().trim());
        if (req.location() != null) listing.setLocation(blankToNull(req.location()));
        if (req.imageUrl() != null) listing.setImageUrl(blankToNull(req.imageUrl()));
        if (req.condition() != null) listing.setCondition(parseCondition(req.condition()));
        return toDto(listingRepository.save(listing), userId,
                new HashSet<>(savedListingRepository.findListingIds(userId)));
    }

    @Transactional
    public ListingDto setStatus(Long listingId, Long userId, String statusRaw) {
        Listing listing = requireOwn(listingId, userId);
        listing.setStatus(parseStatus(statusRaw));
        return toDto(listingRepository.save(listing), userId,
                new HashSet<>(savedListingRepository.findListingIds(userId)));
    }

    /** Returns true when the listing is saved after the call. */
    @Transactional
    public boolean toggleSave(Long listingId, Long userId) {
        Listing listing = require(listingId);
        Optional<SavedListing> existing = savedListingRepository.findByUserIdAndListingId(userId, listingId);
        if (existing.isPresent()) {
            savedListingRepository.delete(existing.get());
            return false;
        }
        savedListingRepository.save(SavedListing.builder().user(userService.require(userId)).listing(listing).build());
        return true;
    }

    @Transactional
    public void delete(Long listingId, Long userId) {
        Listing listing = requireOwn(listingId, userId);
        savedListingRepository.deleteByListingId(listingId);
        listingRepository.delete(listing);
    }

    /** Tells the seller someone is interested; the chat itself is a normal thread. */
    @Transactional
    public void notifyInterest(Long listingId, Long buyerId) {
        Listing listing = require(listingId);
        User buyer = userService.require(buyerId);

        notificationService.raise(listing.getSeller(), buyer, Notification.Type.LISTING_INTEREST,
                buyer.getFullName() + " is interested in " + listing.getTitle() + ".",
                "/marketplace/" + listingId, listing.getImageUrl());
    }

    private Listing require(Long listingId) {
        return listingRepository.findById(listingId).orElseThrow(() -> ApiException.notFound("Listing"));
    }

    private Listing requireOwn(Long listingId, Long userId) {
        Listing listing = require(listingId);
        if (!listing.getSeller().getId().equals(userId)) {
            throw ApiException.forbidden("Only the seller can change a listing");
        }
        return listing;
    }

    private static ListingDto toDto(Listing l, Long viewerId, Set<Long> savedIds) {
        return new ListingDto(
                l.getId(),
                UserDto.summary(l.getSeller()),
                l.getTitle(),
                l.getDescription(),
                l.getPrice(),
                l.getCurrency(),
                l.getCategory(),
                l.getLocation(),
                l.getImageUrl(),
                l.getCondition().name(),
                l.getStatus().name(),
                Objects.equals(l.getSeller().getId(), viewerId),
                l.getCreatedAt(),
                savedIds.contains(l.getId()));
    }

    private static Listing.Condition parseCondition(String raw) {
        if (raw == null || raw.isBlank()) return Listing.Condition.USED_GOOD;
        try {
            return Listing.Condition.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Listing.Condition.USED_GOOD;
        }
    }

    private static Listing.Status parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return Listing.Status.AVAILABLE;
        try {
            return Listing.Status.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Listing.Status.AVAILABLE;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
