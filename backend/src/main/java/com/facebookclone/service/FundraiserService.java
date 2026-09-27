package com.facebookclone.service;

import com.facebookclone.dto.ExtrasDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.Donation;
import com.facebookclone.entity.Fundraiser;
import com.facebookclone.entity.Notification;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.DonationRepository;
import com.facebookclone.repository.FundraiserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Fundraisers and donations. This is a clone: a donation records a pledge and
 * moves no money, and the UI says so.
 */
@Service
@RequiredArgsConstructor
public class FundraiserService {

    public static final List<String> CATEGORIES = List.of(
            "Community", "Education", "Emergency Relief", "Health", "Animals", "Environment", "Arts", "Sports");

    private final FundraiserRepository fundraiserRepository;
    private final DonationRepository donationRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<FundraiserDto> all(Long viewerId) {
        return decorate(fundraiserRepository.findAllWithCreator(), viewerId);
    }

    @Transactional(readOnly = true)
    public List<FundraiserDto> mine(Long viewerId) {
        return decorate(fundraiserRepository.findByCreator(viewerId), viewerId);
    }

    @Transactional(readOnly = true)
    public List<FundraiserDto> search(String query, Long viewerId) {
        if (query == null || query.trim().length() < 2) return List.of();
        return decorate(fundraiserRepository.search(query.trim()), viewerId);
    }

    @Transactional(readOnly = true)
    public FundraiserDto one(Long id, Long viewerId) {
        return decorate(List.of(require(id)), viewerId).get(0);
    }

    @Transactional(readOnly = true)
    public List<DonationDto> donations(Long id) {
        return donationRepository.findForFundraiser(id).stream()
                .map(d -> new DonationDto(d.getId(), UserDto.summary(d.getDonor()), d.getAmount(),
                        d.getMessage(), d.getCreatedAt()))
                .toList();
    }

    @Transactional
    public FundraiserDto create(Long userId, FundraiserRequest req) {
        Fundraiser f = fundraiserRepository.save(Fundraiser.builder()
                .creator(userService.require(userId))
                .title(req.title().trim())
                .story(blankToNull(req.story()))
                .coverUrl(blankToNull(req.coverUrl()))
                .goal(req.goal())
                .category(req.category().trim())
                .beneficiary(blankToNull(req.beneficiary()))
                .endsAt(req.endsAt())
                .build());
        return one(f.getId(), userId);
    }

    @Transactional
    public FundraiserDto update(Long id, Long userId, FundraiserRequest req) {
        Fundraiser f = requireOwn(id, userId);
        f.setTitle(req.title().trim());
        f.setStory(blankToNull(req.story()));
        f.setCoverUrl(blankToNull(req.coverUrl()));
        f.setGoal(req.goal());
        f.setCategory(req.category().trim());
        f.setBeneficiary(blankToNull(req.beneficiary()));
        f.setEndsAt(req.endsAt());
        fundraiserRepository.save(f);
        return one(id, userId);
    }

    @Transactional
    public FundraiserDto setClosed(Long id, Long userId, boolean closed) {
        Fundraiser f = requireOwn(id, userId);
        f.setClosed(closed);
        fundraiserRepository.save(f);
        return one(id, userId);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        Fundraiser f = requireOwn(id, userId);
        donationRepository.deleteByFundraiserId(id);
        fundraiserRepository.delete(f);
    }

    @Transactional
    public FundraiserDto donate(Long id, Long userId, DonateRequest req) {
        Fundraiser f = require(id);
        if (f.isClosed() || (f.getEndsAt() != null && f.getEndsAt().isBefore(Instant.now()))) {
            throw ApiException.badRequest("This fundraiser has ended");
        }
        User donor = userService.require(userId);
        donationRepository.save(Donation.builder()
                .fundraiser(f).donor(donor).amount(req.amount()).message(blankToNull(req.message())).build());

        notificationService.raise(f.getCreator(), donor, Notification.Type.FUNDRAISER_DONATION,
                donor.getFullName() + " donated to " + f.getTitle() + ".",
                "/fundraisers/" + id, f.getCoverUrl());
        return one(id, userId);
    }

    private Fundraiser require(Long id) {
        return fundraiserRepository.findById(id).orElseThrow(() -> ApiException.notFound("Fundraiser"));
    }

    private Fundraiser requireOwn(Long id, Long userId) {
        Fundraiser f = require(id);
        if (!f.getCreator().getId().equals(userId)) throw ApiException.forbidden("Only the organiser can do that");
        return f;
    }

    private List<FundraiserDto> decorate(List<Fundraiser> list, Long viewerId) {
        if (list.isEmpty()) return List.of();
        Map<Long, BigDecimal> raised = new HashMap<>();
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : donationRepository.totals(list.stream().map(Fundraiser::getId).toList())) {
            raised.put((Long) row[0], (BigDecimal) row[1]);
            counts.put((Long) row[0], (Long) row[2]);
        }
        return list.stream().map(f -> new FundraiserDto(
                f.getId(),
                UserDto.summary(f.getCreator()),
                f.getTitle(),
                f.getStory(),
                f.getCoverUrl(),
                f.getGoal(),
                raised.getOrDefault(f.getId(), BigDecimal.ZERO),
                f.getCurrency(),
                f.getCategory(),
                f.getBeneficiary(),
                f.getEndsAt(),
                f.isClosed() || (f.getEndsAt() != null && f.getEndsAt().isBefore(Instant.now())),
                counts.getOrDefault(f.getId(), 0L),
                f.getCreator().getId().equals(viewerId),
                f.getCreatedAt())).toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
