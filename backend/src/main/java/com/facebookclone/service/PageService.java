package com.facebookclone.service;

import com.facebookclone.dto.PageDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/** Pages: create and run one, like and follow them, and recommend them. */
@Service
@RequiredArgsConstructor
public class PageService {

    /** The category picker in the Create Page dialog. */
    public static final List<String> CATEGORIES = List.of(
            "Local Business", "Restaurant", "Brand", "Public Figure", "Artist", "Musician/Band",
            "Community", "Nonprofit", "Media/News", "Sports Team", "Education", "Entertainment");

    private final FbPageRepository pageRepository;
    private final PageFollowRepository followRepository;
    private final PageReviewRepository reviewRepository;
    private final PostRepository postRepository;
    private final AdRepository adRepository;
    private final JobPostingRepository jobRepository;
    private final PostService postService;
    private final UserService userService;
    private final ViewerScopeService scopeService;
    private final NotificationService notificationService;

    /** Pages you like or follow. */
    @Transactional(readOnly = true)
    public List<PageDto> connected(Long viewerId) {
        List<Long> ids = followRepository.findConnectedPageIds(viewerId);
        if (ids.isEmpty()) return List.of();
        return decorate(pageRepository.findAllById(ids).stream()
                .sorted(Comparator.comparing(FbPage::getName)).toList(), viewerId);
    }

    @Transactional(readOnly = true)
    public List<PageDto> owned(Long viewerId) {
        return decorate(pageRepository.findOwned(viewerId), viewerId);
    }

    /** Pages you neither own nor follow, most followed first. */
    @Transactional(readOnly = true)
    public List<PageDto> discover(Long viewerId) {
        Set<Long> connected = new HashSet<>(followRepository.findConnectedPageIds(viewerId));
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        List<FbPage> candidates = pageRepository.findAllWithOwner().stream()
                .filter(p -> !connected.contains(p.getId()))
                .filter(p -> !p.getOwner().getId().equals(viewerId))
                .filter(p -> !hidden.contains(p.getOwner().getId()))
                .toList();
        return decorate(candidates, viewerId).stream()
                .sorted(Comparator.comparingLong(PageDto::followerCount).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public PageDto one(Long pageId, Long viewerId) {
        return decorate(List.of(require(pageId)), viewerId).get(0);
    }

    @Transactional(readOnly = true)
    public List<PageDto> search(String query, Long viewerId) {
        if (query == null || query.trim().length() < 2) return List.of();
        return decorate(pageRepository.search(query.trim()), viewerId);
    }

    @Transactional
    public PageDto create(Long ownerId, PageRequest req) {
        User owner = userService.require(ownerId);
        FbPage page = pageRepository.save(FbPage.builder()
                .owner(owner)
                .name(req.name().trim())
                .category(req.category().trim())
                .description(blankToNull(req.description()))
                .avatarUrl(blankToNull(req.avatarUrl()))
                .coverUrl(blankToNull(req.coverUrl()))
                .website(blankToNull(req.website()))
                .phone(blankToNull(req.phone()))
                .location(blankToNull(req.location()))
                .build());
        // The owner likes and follows their own Page, as they do on Facebook.
        followRepository.save(PageFollow.builder().page(page).user(owner).liked(true).following(true).build());
        return one(page.getId(), ownerId);
    }

    @Transactional
    public PageDto update(Long pageId, Long userId, PageRequest req) {
        FbPage page = requireOwned(pageId, userId);
        page.setName(req.name().trim());
        page.setCategory(req.category().trim());
        page.setDescription(blankToNull(req.description()));
        page.setAvatarUrl(blankToNull(req.avatarUrl()));
        page.setCoverUrl(blankToNull(req.coverUrl()));
        page.setWebsite(blankToNull(req.website()));
        page.setPhone(blankToNull(req.phone()));
        page.setLocation(blankToNull(req.location()));
        pageRepository.save(page);
        return one(pageId, userId);
    }

    @Transactional
    public void delete(Long pageId, Long userId) {
        FbPage page = requireOwned(pageId, userId);
        postRepository.findAllOnPage(pageId).forEach(postService::purge);
        adRepository.detachPage(pageId);
        jobRepository.detachPage(pageId);
        reviewRepository.deleteByPageId(pageId);
        followRepository.deleteByPageId(pageId);
        pageRepository.delete(page);
    }

    /** Liking also follows; unliking keeps the follow, which is how Facebook behaves. */
    @Transactional
    public PageDto toggleLike(Long pageId, Long userId) {
        FbPage page = require(pageId);
        PageFollow row = followRepository.findByPageIdAndUserId(pageId, userId)
                .orElseGet(() -> PageFollow.builder().page(page).user(userService.require(userId))
                        .liked(false).following(false).build());
        boolean nowLiked = !row.isLiked();
        row.setLiked(nowLiked);
        if (nowLiked) row.setFollowing(true);
        followRepository.save(row);

        if (nowLiked) {
            User user = userService.require(userId);
            notificationService.raise(page.getOwner(), user, Notification.Type.PAGE_LIKE,
                    user.getFullName() + " liked your Page " + page.getName() + ".",
                    "/pages/" + pageId, page.getAvatarUrl());
        }
        return one(pageId, userId);
    }

    @Transactional
    public PageDto toggleFollow(Long pageId, Long userId) {
        FbPage page = require(pageId);
        Optional<PageFollow> existing = followRepository.findByPageIdAndUserId(pageId, userId);
        if (existing.isPresent()) {
            PageFollow row = existing.get();
            if (row.isFollowing() && !row.isLiked()) {
                followRepository.delete(row);
            } else {
                row.setFollowing(!row.isFollowing());
                followRepository.save(row);
            }
        } else {
            followRepository.save(PageFollow.builder().page(page).user(userService.require(userId))
                    .liked(false).following(true).build());
        }
        return one(pageId, userId);
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> reviews(Long pageId, Long viewerId) {
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        return reviewRepository.findForPage(pageId).stream()
                .filter(r -> !hidden.contains(r.getAuthor().getId()))
                .map(r -> new ReviewDto(r.getId(), UserDto.summary(r.getAuthor()), r.isRecommends(),
                        r.getContent(), r.getCreatedAt()))
                .toList();
    }

    /** One recommendation per person; writing again replaces it. */
    @Transactional
    public ReviewDto review(Long pageId, Long userId, ReviewRequest req) {
        FbPage page = require(pageId);
        if (page.getOwner().getId().equals(userId)) throw ApiException.badRequest("You cannot review your own Page");
        User author = userService.require(userId);

        PageReview review = reviewRepository.findByPageIdAndAuthorId(pageId, userId)
                .orElseGet(() -> PageReview.builder().page(page).author(author).build());
        review.setRecommends(req.recommends());
        review.setContent(blankToNull(req.content()));
        PageReview saved = reviewRepository.save(review);

        notificationService.raise(page.getOwner(), author, Notification.Type.PAGE_REVIEW,
                author.getFullName() + (req.recommends() ? " recommends " : " doesn't recommend ")
                        + page.getName() + ".",
                "/pages/" + pageId, page.getAvatarUrl());
        return new ReviewDto(saved.getId(), UserDto.summary(author), saved.isRecommends(),
                saved.getContent(), saved.getCreatedAt());
    }

    @Transactional
    public void deleteReview(Long pageId, Long userId) {
        reviewRepository.findByPageIdAndAuthorId(pageId, userId).ifPresent(reviewRepository::delete);
    }

    @Transactional(readOnly = true)
    public FbPage require(Long pageId) {
        return pageRepository.findById(pageId).orElseThrow(() -> ApiException.notFound("Page"));
    }

    private FbPage requireOwned(Long pageId, Long userId) {
        FbPage page = require(pageId);
        if (!page.getOwner().getId().equals(userId)) throw ApiException.forbidden("Only the Page's owner can do that");
        return page;
    }

    private List<PageDto> decorate(List<FbPage> pages, Long viewerId) {
        if (pages.isEmpty()) return List.of();
        List<Long> ids = pages.stream().map(FbPage::getId).toList();

        Map<Long, Long> likes = counts(followRepository.countLikes(ids));
        Map<Long, Long> followers = counts(followRepository.countFollowers(ids));
        Map<Long, PageFollow> mine = followRepository.findMine(viewerId, ids).stream()
                .collect(Collectors.toMap(f -> f.getPage().getId(), f -> f));

        return pages.stream().map(p -> {
            List<PageReview> reviews = reviewRepository.findForPage(p.getId());
            Integer percent = reviews.isEmpty() ? null
                    : (int) Math.round(100.0 * reviews.stream().filter(PageReview::isRecommends).count() / reviews.size());
            PageFollow f = mine.get(p.getId());
            return new PageDto(
                    p.getId(),
                    p.getName(),
                    p.getCategory(),
                    p.getDescription(),
                    p.getAvatarUrl(),
                    p.getCoverUrl(),
                    p.getWebsite(),
                    p.getPhone(),
                    p.getLocation(),
                    UserDto.summary(p.getOwner()),
                    likes.getOrDefault(p.getId(), 0L),
                    followers.getOrDefault(p.getId(), 0L),
                    f != null && f.isLiked(),
                    f != null && f.isFollowing(),
                    p.getOwner().getId().equals(viewerId),
                    percent,
                    reviews.size(),
                    p.getCreatedAt());
        }).toList();
    }

    private static Map<Long, Long> counts(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
