package com.facebookclone.service;

import com.facebookclone.dto.ExtrasDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.Ad;
import com.facebookclone.entity.FbPage;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.AdRepository;
import com.facebookclone.repository.FbPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/** Ads Manager and ad delivery. Impressions and clicks are counted for real. */
@Service
@RequiredArgsConstructor
public class AdService {

    private static final Set<String> CALLS_TO_ACTION =
            Set.of("LEARN_MORE", "SHOP_NOW", "SIGN_UP", "BOOK_NOW", "CONTACT_US", "DOWNLOAD");

    private final AdRepository adRepository;
    private final FbPageRepository pageRepository;
    private final UserService userService;
    private final ViewerScopeService scopeService;

    /** A random handful of live ads; each one served counts an impression. */
    @Transactional
    public List<AdDto> serve(Long viewerId, int count) {
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        List<Ad> pool = new ArrayList<>(adRepository.findActive().stream()
                .filter(a -> !hidden.contains(a.getAdvertiser().getId()))
                .toList());
        Collections.shuffle(pool);
        List<Ad> chosen = pool.stream().limit(Math.max(1, Math.min(count, 6))).toList();
        if (!chosen.isEmpty()) adRepository.countImpressions(chosen.stream().map(Ad::getId).toList());
        return chosen.stream().map(a -> toDto(a, viewerId)).toList();
    }

    /** Records the click and hands back where to go. */
    @Transactional
    public String click(Long adId) {
        Ad ad = require(adId);
        ad.setClicks(ad.getClicks() + 1);
        adRepository.save(ad);
        return ad.getLinkUrl();
    }

    @Transactional(readOnly = true)
    public List<AdDto> mine(Long userId) {
        return adRepository.findByAdvertiser(userId).stream().map(a -> toDto(a, userId)).toList();
    }

    @Transactional
    public AdDto create(Long userId, AdRequest req) {
        Ad ad = Ad.builder().advertiser(userService.require(userId)).build();
        apply(ad, req, userId);
        return toDto(adRepository.save(ad), userId);
    }

    @Transactional
    public AdDto update(Long adId, Long userId, AdRequest req) {
        Ad ad = requireOwn(adId, userId);
        apply(ad, req, userId);
        return toDto(adRepository.save(ad), userId);
    }

    @Transactional
    public AdDto setActive(Long adId, Long userId, boolean active) {
        Ad ad = requireOwn(adId, userId);
        ad.setActive(active);
        return toDto(adRepository.save(ad), userId);
    }

    @Transactional
    public void delete(Long adId, Long userId) {
        adRepository.delete(requireOwn(adId, userId));
    }

    private void apply(Ad ad, AdRequest req, Long userId) {
        String link = req.linkUrl().trim();
        if (!link.startsWith("http://") && !link.startsWith("https://")) link = "https://" + link;
        String cta = req.callToAction() == null || req.callToAction().isBlank()
                ? "LEARN_MORE" : req.callToAction().trim().toUpperCase();
        if (!CALLS_TO_ACTION.contains(cta)) throw ApiException.badRequest("Unknown call to action");

        FbPage page = null;
        if (req.pageId() != null) {
            page = pageRepository.findById(req.pageId()).orElseThrow(() -> ApiException.notFound("Page"));
            if (!page.getOwner().getId().equals(userId)) throw ApiException.forbidden("You can only advertise your own Page");
        }
        ad.setTitle(req.title().trim());
        ad.setBody(req.body() == null || req.body().isBlank() ? null : req.body().trim());
        ad.setImageUrl(req.imageUrl() == null || req.imageUrl().isBlank() ? null : req.imageUrl().trim());
        ad.setLinkUrl(link);
        ad.setCallToAction(cta);
        ad.setDailyBudget(req.dailyBudget());
        ad.setPage(page);
        if (req.active() != null) ad.setActive(req.active());
    }

    private Ad require(Long adId) {
        return adRepository.findById(adId).orElseThrow(() -> ApiException.notFound("Ad"));
    }

    private Ad requireOwn(Long adId, Long userId) {
        Ad ad = require(adId);
        if (!ad.getAdvertiser().getId().equals(userId)) throw ApiException.forbidden("That ad is not yours");
        return ad;
    }

    private static AdDto toDto(Ad a, Long viewerId) {
        boolean mine = a.getAdvertiser().getId().equals(viewerId);
        return new AdDto(
                a.getId(),
                UserDto.summary(a.getAdvertiser()),
                PostService.pageRef(a.getPage()),
                a.getTitle(),
                a.getBody(),
                a.getImageUrl(),
                a.getLinkUrl(),
                a.getCallToAction(),
                mine ? a.getDailyBudget() : null,
                mine ? a.getImpressions() : 0,
                mine ? a.getClicks() : 0,
                a.isActive(),
                mine,
                a.getCreatedAt());
    }
}
