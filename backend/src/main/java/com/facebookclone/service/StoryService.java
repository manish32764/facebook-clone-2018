package com.facebookclone.service;

import com.facebookclone.dto.MessageDtos.SendMessageRequest;
import com.facebookclone.dto.StoryDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Stories, grouped into one reel per author the way the rail presents them.
 * Expiry is a query filter on expiresAt, so nothing needs a cleanup job - and
 * an expired story can still live on in a highlight.
 */
@Service
@RequiredArgsConstructor
public class StoryService {

    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final StoryReactionRepository reactionRepository;
    private final StoryHighlightRepository highlightRepository;
    private final FriendshipRepository friendshipRepository;
    private final FollowRepository followRepository;
    private final FriendListRepository friendListRepository;
    private final UserService userService;
    private final ViewerScopeService scopeService;
    private final MessageService messageService;
    private final NotificationService notificationService;

    /** Your own reel first, then people with unseen stories, then the rest. */
    @Transactional(readOnly = true)
    public List<StoryReelDto> reels(Long viewerId) {
        Set<Long> friends = new HashSet<>(friendshipRepository.findFriendIds(viewerId));
        Set<Long> followed = new HashSet<>(followRepository.findFolloweeIds(viewerId));
        Set<Long> closeTo = new HashSet<>(friendListRepository.findOwnersWithCloseFriend(viewerId));
        Set<Long> hidden = scopeService.hiddenIds(viewerId);

        Set<Long> authorIds = new HashSet<>(friends);
        authorIds.addAll(followed);
        authorIds.add(viewerId);
        authorIds.removeAll(hidden);

        List<Story> live = storyRepository.findLive(authorIds, Instant.now()).stream()
                .filter(s -> canSee(s, viewerId, friends, closeTo))
                .toList();
        if (live.isEmpty()) return List.of();

        List<Long> storyIds = live.stream().map(Story::getId).toList();
        Set<Long> seen = new HashSet<>(storyViewRepository.findSeenStoryIds(viewerId, storyIds));
        Map<Long, Long> viewCounts = counts(storyViewRepository.countByStoryIds(storyIds));
        Map<Long, Long> reactionCounts = counts(reactionRepository.countByStoryIds(storyIds));

        Map<Long, List<Story>> byAuthor = live.stream()
                .collect(Collectors.groupingBy(s -> s.getAuthor().getId(), LinkedHashMap::new, Collectors.toList()));

        List<StoryReelDto> reels = new ArrayList<>();
        for (List<Story> authorStories : byAuthor.values()) {
            User author = authorStories.get(0).getAuthor();
            boolean own = author.getId().equals(viewerId);
            List<StoryDto> items = authorStories.stream()
                    .map(s -> toDto(s, seen.contains(s.getId()),
                            own ? viewCounts.getOrDefault(s.getId(), 0L) : 0,
                            own ? reactionCounts.getOrDefault(s.getId(), 0L) : 0))
                    .toList();
            reels.add(new StoryReelDto(UserDto.summary(author), items,
                    items.stream().allMatch(StoryDto::seen)));
        }

        reels.sort(Comparator
                .comparing((StoryReelDto r) -> !r.author().id().equals(viewerId))
                .thenComparing(StoryReelDto::allSeen));
        return reels;
    }

    @Transactional
    public StoryDto create(Long authorId, CreateStoryRequest req) {
        boolean hasImage = req.imageUrl() != null && !req.imageUrl().isBlank();
        boolean hasText = req.text() != null && !req.text().isBlank();
        boolean hasOverlays = req.overlays() != null && !req.overlays().isBlank() && !"[]".equals(req.overlays().trim());
        if (!hasImage && !hasText && !hasOverlays) {
            throw ApiException.badRequest("A story needs a photo or some text");
        }

        Story story = storyRepository.save(Story.builder()
                .author(userService.require(authorId))
                .imageUrl(hasImage ? req.imageUrl().trim() : null)
                .text(hasText ? req.text().trim() : null)
                .backgroundColor(req.backgroundColor() == null || req.backgroundColor().isBlank()
                        ? "#4267b2" : req.backgroundColor().trim())
                .overlays(hasOverlays ? req.overlays().trim() : null)
                .audience(parseAudience(req.audience()))
                .build());

        return toDto(story, true, 0, 0);
    }

    /** Idempotent: viewing the same story twice does not double the count. */
    @Transactional
    public void markSeen(Long storyId, Long viewerId) {
        Story story = require(storyId);
        if (story.getAuthor().getId().equals(viewerId)) return;
        if (storyViewRepository.existsByStoryIdAndViewerId(storyId, viewerId)) return;

        storyViewRepository.save(StoryView.builder()
                .story(story).viewer(userService.require(viewerId)).build());
    }

    /** A quick emoji from the viewer. The author gets a notification for each one. */
    @Transactional
    public void react(Long storyId, Long userId, String emoji) {
        Story story = require(storyId);
        if (story.getAuthor().getId().equals(userId)) throw ApiException.badRequest("You cannot react to your own story");
        scopeService.requireNotBlocked(userId, story.getAuthor().getId());

        User user = userService.require(userId);
        reactionRepository.save(StoryReaction.builder().story(story).user(user).emoji(emoji.trim()).build());
        notificationService.raise(story.getAuthor(), user, Notification.Type.STORY_REACTION,
                user.getFullName() + " reacted " + emoji.trim() + " to your story.", "/", story.getImageUrl());
    }

    /** Replies go to the author as a Messenger message, quoting the story. */
    @Transactional
    public Long reply(Long storyId, Long userId, String content) {
        Story story = require(storyId);
        if (story.getAuthor().getId().equals(userId)) throw ApiException.badRequest("You cannot reply to your own story");
        scopeService.requireNotBlocked(userId, story.getAuthor().getId());

        Long conversationId = messageService.openDirect(userId, story.getAuthor().getId()).id();
        String quoted = story.getText() == null ? "" : " “" + abbreviate(story.getText(), 60) + "”";
        messageService.send(conversationId, userId, new SendMessageRequest(
                "Replied to your story" + quoted + ": " + content.trim(), story.getImageUrl(), "TEXT"));

        User user = userService.require(userId);
        notificationService.raise(story.getAuthor(), user, Notification.Type.STORY_REPLY,
                user.getFullName() + " replied to your story.", "/messages/" + conversationId, story.getImageUrl());
        return conversationId;
    }

    /** "Seen by", with each viewer's reactions. Author only. */
    @Transactional(readOnly = true)
    public List<StoryViewerDto> viewers(Long storyId, Long userId) {
        Story story = require(storyId);
        if (!story.getAuthor().getId().equals(userId)) throw ApiException.forbidden("Only the author sees who viewed");

        Map<Long, List<String>> reactionsByUser = new HashMap<>();
        Map<Long, User> reactors = new HashMap<>();
        for (StoryReaction r : reactionRepository.findForStory(storyId)) {
            reactionsByUser.computeIfAbsent(r.getUser().getId(), key -> new ArrayList<>()).add(r.getEmoji());
            reactors.put(r.getUser().getId(), r.getUser());
        }

        List<StoryViewerDto> rows = new ArrayList<>();
        Set<Long> listed = new HashSet<>();
        for (StoryView view : storyViewRepository.findForStory(storyId)) {
            Long id = view.getViewer().getId();
            listed.add(id);
            rows.add(new StoryViewerDto(UserDto.summary(view.getViewer()), view.getViewedAt(),
                    reactionsByUser.getOrDefault(id, List.of())));
        }
        // Someone can react without a recorded view if they reacted instantly.
        reactors.forEach((id, user) -> {
            if (!listed.contains(id)) {
                rows.add(new StoryViewerDto(UserDto.summary(user), null, reactionsByUser.get(id)));
            }
        });
        return rows;
    }

    @Transactional
    public void delete(Long storyId, Long userId) {
        Story story = require(storyId);
        if (!story.getAuthor().getId().equals(userId)) {
            throw ApiException.forbidden("You can only remove your own stories");
        }
        for (StoryHighlight highlight : highlightRepository.findContaining(storyId)) {
            highlight.getStories().removeIf(s -> s.getId().equals(storyId));
            highlightRepository.save(highlight);
        }
        storyViewRepository.deleteByStoryId(storyId);
        reactionRepository.deleteByStoryId(storyId);
        storyRepository.delete(story);
    }

    /** Every story you have posted, expired or not - the source for highlights. */
    @Transactional(readOnly = true)
    public List<StoryDto> archive(Long userId) {
        List<Story> stories = storyRepository.findArchive(userId);
        List<Long> ids = stories.stream().map(Story::getId).toList();
        Map<Long, Long> views = ids.isEmpty() ? Map.of() : counts(storyViewRepository.countByStoryIds(ids));
        Map<Long, Long> reactions = ids.isEmpty() ? Map.of() : counts(reactionRepository.countByStoryIds(ids));
        return stories.stream()
                .map(s -> toDto(s, true, views.getOrDefault(s.getId(), 0L), reactions.getOrDefault(s.getId(), 0L)))
                .toList();
    }

    // -------------------------------------------------------------- highlights ---

    @Transactional(readOnly = true)
    public List<HighlightDto> highlights(Long ownerId, Long viewerId) {
        if (scopeService.blockedEitherWay(ownerId, viewerId)) return List.of();
        return highlightRepository.findForOwner(ownerId).stream().map(StoryService::toDto).toList();
    }

    @Transactional
    public HighlightDto createHighlight(Long ownerId, HighlightRequest req) {
        String title = req.title() == null || req.title().isBlank() ? "Highlights" : req.title().trim();
        StoryHighlight highlight = StoryHighlight.builder()
                .owner(userService.require(ownerId)).title(title).build();
        highlight.getStories().addAll(ownStories(ownerId, req.storyIds()));
        if (highlight.getStories().isEmpty()) throw ApiException.badRequest("Pick at least one story");
        return toDto(highlightRepository.save(highlight));
    }

    /** Replaces the title and the story list. */
    @Transactional
    public HighlightDto updateHighlight(Long ownerId, Long highlightId, HighlightRequest req) {
        StoryHighlight highlight = requireOwnHighlight(ownerId, highlightId);
        if (req.title() != null && !req.title().isBlank()) highlight.setTitle(req.title().trim());
        if (req.storyIds() != null) {
            List<Story> stories = ownStories(ownerId, req.storyIds());
            if (stories.isEmpty()) throw ApiException.badRequest("A highlight needs at least one story");
            highlight.getStories().clear();
            highlight.getStories().addAll(stories);
        }
        return toDto(highlightRepository.save(highlight));
    }

    @Transactional
    public void deleteHighlight(Long ownerId, Long highlightId) {
        highlightRepository.delete(requireOwnHighlight(ownerId, highlightId));
    }

    private List<Story> ownStories(Long ownerId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        return storyRepository.findAllById(ids).stream()
                .filter(s -> s.getAuthor().getId().equals(ownerId))
                .sorted(Comparator.comparing(Story::getCreatedAt))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private StoryHighlight requireOwnHighlight(Long ownerId, Long highlightId) {
        StoryHighlight highlight = highlightRepository.findById(highlightId)
                .orElseThrow(() -> ApiException.notFound("Highlight"));
        if (!highlight.getOwner().getId().equals(ownerId)) throw ApiException.forbidden("That highlight is not yours");
        return highlight;
    }

    // ----------------------------------------------------------------- helpers ---

    private static boolean canSee(Story story, Long viewerId, Set<Long> friends, Set<Long> closeTo) {
        Long authorId = story.getAuthor().getId();
        if (authorId.equals(viewerId)) return true;
        return switch (story.audienceOrDefault()) {
            case PUBLIC -> true;
            case FRIENDS -> friends.contains(authorId);
            case CLOSE_FRIENDS -> closeTo.contains(authorId);
        };
    }

    private Story require(Long storyId) {
        return storyRepository.findById(storyId).orElseThrow(() -> ApiException.notFound("Story"));
    }

    private static Map<Long, Long> counts(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }

    private static Story.Audience parseAudience(String raw) {
        if (raw == null || raw.isBlank()) return Story.Audience.FRIENDS;
        try {
            return Story.Audience.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Story.Audience.FRIENDS;
        }
    }

    private static String abbreviate(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }

    private static StoryDto toDto(Story s, boolean seen, long viewCount, long reactionCount) {
        return new StoryDto(s.getId(), s.getImageUrl(), s.getText(), s.getBackgroundColor(),
                s.getCreatedAt(), s.getExpiresAt(), seen, viewCount, s.getOverlays(),
                s.audienceOrDefault().name(), reactionCount);
    }

    private static HighlightDto toDto(StoryHighlight h) {
        List<StoryDto> stories = h.getStories().stream().map(s -> toDto(s, true, 0, 0)).toList();
        String cover = h.getStories().stream().map(Story::getImageUrl).filter(Objects::nonNull).findFirst().orElse(null);
        return new HighlightDto(h.getId(), h.getTitle(), cover, UserDto.summary(h.getOwner()), stories);
    }
}
