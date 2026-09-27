package com.facebookclone.controller;

import com.facebookclone.dto.ListingDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.MarketplaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    @GetMapping("/categories")
    public List<String> categories() {
        return MarketplaceService.CATEGORIES;
    }

    @GetMapping
    public List<ListingDto> browse(@RequestParam(required = false) String category,
                                   @RequestParam(required = false) String q,
                                   @RequestParam(required = false) BigDecimal minPrice,
                                   @RequestParam(required = false) BigDecimal maxPrice,
                                   @RequestParam(required = false) String location,
                                   @RequestParam(required = false) String condition,
                                   @RequestParam(required = false) String sort,
                                   @CurrentUser AppUserPrincipal me) {
        return marketplaceService.browse(
                new ListingFilter(category, q, minPrice, maxPrice, location, condition, sort), me.getId());
    }

    @GetMapping("/mine")
    public List<ListingDto> mine(@CurrentUser AppUserPrincipal me) {
        return marketplaceService.bySeller(me.getId(), me.getId());
    }

    @GetMapping("/saved")
    public List<ListingDto> saved(@CurrentUser AppUserPrincipal me) {
        return marketplaceService.saved(me.getId());
    }

    @GetMapping("/seller/{sellerId}")
    public List<ListingDto> bySeller(@PathVariable Long sellerId, @CurrentUser AppUserPrincipal me) {
        return marketplaceService.bySeller(sellerId, me.getId());
    }

    @GetMapping("/{id}")
    public ListingDto one(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return marketplaceService.one(id, me.getId());
    }

    @PostMapping
    public ResponseEntity<ListingDto> create(@CurrentUser AppUserPrincipal me,
                                             @Valid @RequestBody CreateListingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(marketplaceService.create(me.getId(), request));
    }

    @PatchMapping("/{id}")
    public ListingDto update(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                             @Valid @RequestBody UpdateListingRequest request) {
        return marketplaceService.update(id, me.getId(), request);
    }

    @PatchMapping("/{id}/status")
    public ListingDto setStatus(@PathVariable Long id,
                                @CurrentUser AppUserPrincipal me,
                                @RequestBody Map<String, String> body) {
        return marketplaceService.setStatus(id, me.getId(), body.get("status"));
    }

    @PostMapping("/{id}/save")
    public Map<String, Object> toggleSave(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return Map.of("listingId", id, "saved", marketplaceService.toggleSave(id, me.getId()));
    }

    /** Pings the seller that you are interested; the reply happens in Messenger. */
    @PostMapping("/{id}/interest")
    public ResponseEntity<Void> interest(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        marketplaceService.notifyInterest(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        marketplaceService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }
}
