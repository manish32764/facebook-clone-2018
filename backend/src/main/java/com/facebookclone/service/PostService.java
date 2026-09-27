package com.facebookclone.service;

import com.facebookclone.dto.GroupDtos.GroupRefDto;
import com.facebookclone.dto.PageDtos.PageRefDto;
import com.facebookclone.dto.PostDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.facebookclone.dto.PostDtos.parsePrivacy;

/**
 * Everything that happens to a post: publishing, editing, reacting, commenting,
 * sharing, saving, pinning and approving.
 *
 * Who may see a post is decided in one JPQL fragment ({@link PostRepository#VISIBLE});
 * this class only builds the {@link ViewerScope} it needs. Feed reads are
 * batched, so a page of posts costs a fixed number of round trips.
 */
@Service
@RequiredArgsConstructor
public class PostService {

    /** How many recent posts "Top Stories" ranks before paging. */
    private static final int TOP_CANDIDATES = 200;

    /** Replies nest this deep; a reply to anything deeper joins its parent's thread. */
    private static final int MAX_COMMENT_DEPTH = 3;

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository likeRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final SavedPostRepository savedPostRepository;
    private final HiddenPostRepository hiddenPostRepository;
    private final FriendshipRepository friendshipRepository;
    private final FollowRepository followRepository;
    private final FriendListRepository friendListRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final SocialGroupRepository groupRepository;
    private final FbPageRepository pageRepository;
    private final PageFollowRepository pageFollowRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final NotificationService notificationService;
    private final ViewerScopeService scopeService;

    // ------------------------------------------------------------------ reads ---

    /**
     * The News Feed. "recent" is strictly newest first; anything else is Top
     * Stories, which ranks a window of recent posts by engagement, closeness
     * and age.
     */
    @Transactional(readOnly = true)
    public List<PostDto> feed(Long viewerId, int page, int size, String mode) {
        ViewerScope scope = scopeService.of(viewerId);

        Set<Long> authorIds = new HashSet<>(scope.friendIds());
        authorIds.addAll(followRepository.findFolloweeIds(viewerId));
        authorIds.add(viewerId);
        authorIds.removeAll(scope.hiddenIds());

        Set<Long> pageIds = new HashSet<>(pageFollowRepository.findFollowedPageIds(viewerId));
        pageRepository.findOwned(viewerId).forEach(p -> pageIds.add(p.getId()));

        if ("recent".equalsIgnoreCase(mode)) {
            List<Post> posts = postRepository.findFeed(authorIds, ViewerScope.orSentinel(pageIds), viewerId,
                    scope.friends(), scope.groups(), scope.hidden(), PageRequest.of(page, size));
            return decorate(posts, viewerId);
        }

        List<Post> candidates = postRepository.findFeed(authorIds, ViewerScope.orSentinel(pageIds), viewerId,
                scope.friends(), scope.groups(), scope.hidden(), PageRequest.of(0, TOP_CANDIDATES));
        List<Post> ranked = rank(candidates, viewerId);

        int from = Math.min(page * size, ranked.size());
        int to = Math.min(from + size, ranked.size());
        return decorate(ranked.subList(from, to), viewerId);
    }

    @Transactional(readOnly = true)
    public List<PostDto> timeline(Long profileId, Long viewerId, int page, int size) {
        if (scopeService.blockedEitherWay(viewerId, profileId)) return List.of();
        ViewerScope scope = scopeService.of(viewerId);
        return decorate(postRepository.findTimeline(profileId, viewerId, scope.friends(), scope.groups(),
                scope.hidden(), PageRequest.of(page, size)), viewerId);
    }

    @Transactional(readOnly = true)
    public List<PostDto> groupFeed(Long groupId, Long viewerId, int page, int size) {
        SocialGroup group = groupRepository.findById(groupId).orElseThrow(() -> ApiException.notFound("Group"));
        if (group.getPrivacy() == SocialGroup.Privacy.PRIVATE
                && !groupMemberRepository.existsByGroupIdAndUserId(groupId, viewerId)) {
            return List.of();
        }
        List<Long> hidden = ViewerScope.orSentinel(scopeService.hiddenIds(viewerId));
        return decorate(postRepository.findByGroup(groupId, hidden, PageRequest.of(page, size)), viewerId);
    }

    @Transactional(readOnly = true)
    public List<PostDto> pageFeed(Long pageId, Long viewerId, int page, int size) {
        ViewerScope scope = scopeService.of(viewerId);
        return decorate(postRepository.findByPage(pageId, viewerId, scope.friends(), scope.groups(),
                scope.hidden(), PageRequest.of(page, size)), viewerId);
    }

    /** Posts waiting for approval in a group; admins and moderators only. */
    @Transactional(readOnly = true)
    public List<PostDto> pendingInGroup(Long groupId, Long viewerId) {
        requireGroupModerator(groupId, viewerId);
        return decorate(postRepository.findPendingInGroup(groupId), viewerId);
    }

    /** Watch: every post carrying a video the viewer may see. */
    @Transactional(readOnly = true)
    public List<PostDto> videos(Long viewerId, int page, int size) {
        ViewerScope scope = scopeService.of(viewerId);
        return decorate(postRepository.findVideos(viewerId, scope.friends(), scope.groups(), scope.hidden(),
                PageRequest.of(page, size)), viewerId);
    }

    /** Saved, most recently saved first. */
    @Transactional(readOnly = true)
    public List<PostDto> saved(Long viewerId, int page, int size) {
        List<Long> savedIds = savedPostRepository.findAllSavedPostIds(viewerId);
        if (savedIds.isEmpty()) return List.of();

        int from = Math.min(page * size, savedIds.size());
        int to = Math.min(from + size, savedIds.size());
        List<Long> slice = savedIds.subList(from, to);
        if (slice.isEmpty()) return List.of();

        Map<Long, Integer> order = new HashMap<>();
        for (int i = 0; i < slice.size(); i++) order.put(slice.get(i), i);

        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        List<Post> posts = new ArrayList<>(postRepository.findAllByIds(slice));
        posts.removeIf(p -> hidden.contains(p.getAuthor().getId()));
        posts.sort(Comparator.comparingInt(p -> order.getOrDefault(p.getId(), Integer.MAX_VALUE)));
        return decorate(posts, viewerId);
    }

    /**
     * On This Day: your own posts from a year or more ago that fall within three
     * days of today, which is roughly the window the real product uses.
     */
    @Transactional(readOnly = true)
    public List<PostDto> memories(Long viewerId) {
        Instant aYearAgo = Instant.now().minus(365, ChronoUnit.DAYS);
        List<Post> older = postRepository.findOlderThan(viewerId, aYearAgo, PageRequest.of(0, 100));

        List<Post> onThisDay = older.stream()
                .filter(p -> withinDaysOfAnniversary(p.getCreatedAt(), 3))
                .limit(20)
                .toList();

        // Nothing matched the window: show the oldest few so the page is never blank.
        List<Post> chosen = onThisDay.isEmpty()
                ? older.stream().skip(Math.max(0, older.size() - 5)).toList()
                : onThisDay;
        return decorate(chosen, viewerId);
    }

    /** One post for a permalink. A pending post is shown to its author and the group's moderators. */
    @Transactional(readOnly = true)
    public PostDto one(Long postId, Long viewerId) {
        ViewerScope scope = scopeService.of(viewerId);
        Post post = postRepository.findVisible(postId, viewerId, scope.friends(), scope.groups(), scope.hidden())
                .or(() -> postRepository.findById(postId)
                        .filter(p -> p.isPending() && (p.getAuthor().getId().equals(viewerId)
                                || isGroupModerator(p.getGroup().getId(), viewerId))))
                .orElseThrow(() -> ApiException.notFound("Post"));
        return decorate(List.of(post), viewerId).get(0);
    }

    @Transactional(readOnly = true)
    public List<PostDto> search(String query, Long viewerId, int limit) {
        if (query == null || query.trim().length() < 2) return List.of();
        ViewerScope scope = scopeService.of(viewerId);
        return decorate(postRepository.search(query.trim(), "%", viewerId, scope.friends(), scope.groups(),
                scope.hidden(), PageRequest.of(0, limit)), viewerId);
    }

    // ----------------------------------------------------------------- writes ---

    @Transactional
    public PostDto create(Long authorId, CreatePostRequest req) {
        boolean hasText = req.content() != null && !req.content().isBlank();
        boolean hasMedia = notBlank(req.imageUrl()) || notBlank(req.videoUrl());
        if (!hasText && !hasMedia) {
            throw ApiException.badRequest("A post needs either text or an image");
        }

        User author = userService.require(authorId);
        Post.Privacy privacy = parsePrivacy(req.privacy());

        SocialGroup group = null;
        boolean pending = false;
        if (req.groupId() != null) {
            group = groupRepository.findById(req.groupId()).orElseThrow(() -> ApiException.notFound("Group"));
            GroupMember membership = groupMemberRepository.findByGroupIdAndUserId(group.getId(), authorId)
                    .orElseThrow(() -> ApiException.forbidden("Join the group before posting in it"));
            pending = group.isPostApproval() && membership.getRole() == GroupMember.Role.MEMBER;
            privacy = Post.Privacy.PUBLIC;
        }

        FbPage page = null;
        if (req.pageId() != null) {
            page = pageRepository.findById(req.pageId()).orElseThrow(() -> ApiException.notFound("Page"));
            if (!page.getOwner().getId().equals(authorId)) {
                throw ApiException.forbidden("Only the Page's owner can post as it");
            }
            privacy = Post.Privacy.PUBLIC;
        }

        User wallOwner = null;
        if (req.wallOwnerId() != null && !req.wallOwnerId().equals(authorId)) {
            if (group != null || page != null) throw ApiException.badRequest("Pick one place to post");
            scopeService.requireNotBlocked(authorId, req.wallOwnerId());
            if (!friendshipRepository.findFriendIds(authorId).contains(req.wallOwnerId())) {
                throw ApiException.forbidden("You can only write on a friend's timeline");
            }
            wallOwner = userService.require(req.wallOwnerId());
        }

        Post post = Post.builder()
                .author(author)
                .content(req.content() == null ? "" : req.content().trim())
                .imageUrl(blankToNull(req.imageUrl()))
                .videoUrl(blankToNull(req.videoUrl()))
                .feeling(blankToNull(req.feeling()))
                .location(blankToNull(req.location()))
                .privacy(privacy)
                .group(group)
                .page(page)
                .wallOwner(wallOwner)
                .pending(pending)
                .build();

        applyAudience(post, privacy, req.audienceUserIds(), authorId);

        if (req.tagUserIds() != null && !req.tagUserIds().isEmpty()) {
            List<Long> ids = req.tagUserIds().stream().filter(id -> !id.equals(authorId)).distinct().toList();
            post.setTaggedUsers(new LinkedHashSet<>(userRepository.findAllById(ids)));
        }

        Post saved = postRepository.save(post);

        for (User tagged : saved.getTaggedUsers()) {
            notificationService.raise(tagged, author, Notification.Type.TAG,
                    author.getFullName() + " tagged you in a post.",
                    "/posts/" + saved.getId(), saved.getImageUrl());
        }
        if (wallOwner != null) {
            notificationService.raise(wallOwner, author, Notification.Type.WALL_POST,
                    author.getFullName() + " wrote on your timeline.",
                    "/posts/" + saved.getId(), saved.getImageUrl());
        }
        if (group != null) {
            if (pending) {
                notifyGroupModerators(group, author, author.getFullName() + " posted in " + group.getName()
                        + " and is waiting for approval.", Notification.Type.GROUP_POST_PENDING);
            } else {
                notifyGroupMembers(group, author, saved);
            }
        }

        return decorate(List.of(saved), authorId).get(0);
    }

    /** Re-shares a post onto your own timeline, with an optional note on top. */
    @Transactional
    public PostDto share(Long postId, Long userId, SharePostRequest req) {
        Post original = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("Post"));
        // Sharing a share points at the original, the way the real product does.
        Post target = original.getSharedPost() != null ? original.getSharedPost() : original;
        scopeService.requireNotBlocked(userId, target.getAuthor().getId());

        User sharer = userService.require(userId);
        Post share = postRepository.save(Post.builder()
                .author(sharer)
                .content(req == null || req.content() == null ? "" : req.content().trim())
                .privacy(req == null ? Post.Privacy.PUBLIC : parsePrivacy(req.privacy()))
                .sharedPost(target)
                .build());

        notificationService.raise(target.getAuthor(), sharer, Notification.Type.POST_SHARE,
                sharer.getFullName() + " shared your post.", "/posts/" + share.getId(), target.getImageUrl());

        return decorate(List.of(share), userId).get(0);
    }

    @Transactional
    public PostDto update(Long postId, Long userId, UpdatePostRequest req) {
        Post post = requirePost(postId);
        if (!post.getAuthor().getId().equals(userId)) {
            throw ApiException.forbidden("You can only edit your own posts");
        }

        if (req.content() != null) post.setContent(req.content().trim());
        if (req.feeling() != null) post.setFeeling(blankToNull(req.feeling()));
        if (req.location() != null) post.setLocation(blankToNull(req.location()));
        if (req.privacy() != null && post.getGroup() == null && post.getPage() == null) {
            Post.Privacy privacy = parsePrivacy(req.privacy());
            post.setPrivacy(privacy);
            applyAudience(post, privacy, req.audienceUserIds(), userId);
        }
        post.setEditedAt(Instant.now());

        return decorate(List.of(postRepository.save(post)), userId).get(0);
    }

    @Transactional
    public void delete(Long postId, Long requesterId) {
        Post post = requirePost(postId);
        if (!canDelete(post, requesterId, groupRoleOf(post, requesterId))) {
            throw ApiException.forbidden("You can only delete your own posts");
        }
        purge(post);
    }

    /**
     * Removes a post and everything hanging off it. Re-shares survive and simply
     * lose their embedded original.
     */
    @Transactional
    public void purge(Post post) {
        Long id = post.getId();
        commentLikeRepository.deleteForPost(id);
        commentRepository.detachParents(id);
        commentRepository.deleteByPostId(id);
        likeRepository.deleteByPostId(id);
        savedPostRepository.deleteByPostId(id);
        hiddenPostRepository.deleteByPostId(id);
        postRepository.detachShares(id);
        post.getComments().clear();
        post.getLikes().clear();
        postRepository.delete(post);
    }

    /** Toggles the pin; returns the post afterwards. */
    @Transactional
    public PostDto togglePin(Long postId, Long userId) {
        Post post = requirePost(postId);
        if (!canPin(post, userId, groupRoleOf(post, userId))) {
            throw ApiException.forbidden("You cannot pin this post");
        }
        post.setPinned(!post.isPinned());
        return decorate(List.of(postRepository.save(post)), userId).get(0);
    }

    /** Publishes a post that was waiting for approval. */
    @Transactional
    public PostDto approve(Long postId, Long userId) {
        Post post = requirePost(postId);
        if (post.getGroup() == null || !post.isPending()) throw ApiException.badRequest("Nothing to approve");
        requireGroupModerator(post.getGroup().getId(), userId);

        post.setPending(false);
        post.setCreatedAt(Instant.now());
        Post saved = postRepository.save(post);

        User approver = userService.require(userId);
        notificationService.raise(post.getAuthor(), approver, Notification.Type.GROUP_POST_APPROVED,
                "Your post in " + post.getGroup().getName() + " was approved.",
                "/posts/" + postId, post.getImageUrl());
        notifyGroupMembers(post.getGroup(), post.getAuthor(), saved);
        return decorate(List.of(saved), userId).get(0);
    }

    /** Declining a pending post deletes it. */
    @Transactional
    public void decline(Long postId, Long userId) {
        Post post = requirePost(postId);
        if (post.getGroup() == null || !post.isPending()) throw ApiException.badRequest("Nothing to decline");
        requireGroupModerator(post.getGroup().getId(), userId);
        purge(post);
    }

    private void applyAudience(Post post, Post.Privacy privacy, List<Long> audienceIds, Long authorId) {
        boolean custom = privacy == Post.Privacy.FRIENDS_EXCEPT || privacy == Post.Privacy.SPECIFIC;
        if (!custom) {
            post.getAudience().clear();
            return;
        }
        List<Long> ids = audienceIds == null ? List.of()
                : audienceIds.stream().filter(id -> !id.equals(authorId)).distinct().toList();
        if (privacy == Post.Privacy.SPECIFIC && ids.isEmpty()) {
            throw ApiException.badRequest("Pick at least one friend to share with");
        }
        post.getAudience().clear();
        post.getAudience().addAll(userRepository.findAllById(ids));
    }

    private void notifyGroupMembers(SocialGroup group, User author, Post post) {
        for (GroupMember member : groupMemberRepository.findMembers(group.getId())) {
            notificationService.raise(member.getUser(), author, Notification.Type.GROUP_POST,
                    author.getFullName() + " posted in " + group.getName() + ".",
                    "/groups/" + group.getId(), post.getImageUrl());
        }
    }

    private void notifyGroupModerators(SocialGroup group, User actor, String text, Notification.Type type) {
        for (GroupMember member : groupMemberRepository.findMembers(group.getId())) {
            if (member.getRole() == GroupMember.Role.MEMBER) continue;
            notificationService.raise(member.getUser(), actor, type, text,
                    "/groups/" + group.getId() + "?tab=pending", group.getCoverUrl());
        }
    }

    // -------------------------------------------------------------- reactions ---

    /**
     * Sets, switches or clears a reaction. Sending the reaction you already have
     * removes it, which is exactly how the Like button behaves.
     */
    @Transactional
    public ReactionResponse react(Long postId, Long userId, String reactionRaw) {
        Post post = requirePost(postId);
        scopeService.requireNotBlocked(userId, post.getAuthor().getId());
        ReactionType wanted = ReactionType.parse(reactionRaw);

        Optional<PostLike> existing = likeRepository.findByPostIdAndUserId(postId, userId);
        if (existing.isPresent()) {
            PostLike row = existing.get();
            if (row.reactionOrLike() == wanted) {
                likeRepository.delete(row);
            } else {
                row.setReaction(wanted);
                likeRepository.save(row);
            }
        } else {
            User user = userService.require(userId);
            likeRepository.save(PostLike.builder().post(post).user(user).reaction(wanted).build());

            notificationService.raise(post.getAuthor(), user, Notification.Type.POST_REACTION,
                    user.getFullName() + " reacted " + wanted.getEmoji() + " to your post.",
                    "/posts/" + postId, post.getImageUrl());
        }

        return new ReactionResponse(postId, summariseReactions(postId, userId));
    }

    @Transactional(readOnly = true)
    public List<ReactorDto> reactors(Long postId, Long viewerId) {
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        return likeRepository.findWithUsers(postId).stream()
                .filter(l -> !hidden.contains(l.getUser().getId()))
                .map(l -> new ReactorDto(UserDto.summary(l.getUser()), l.reactionOrLike().name()))
                .toList();
    }

    private ReactionSummary summariseReactions(Long postId, Long viewerId) {
        Map<String, Long> breakdown = new LinkedHashMap<>();
        long total = 0;
        for (Object[] row : likeRepository.countByPostIdsGrouped(List.of(postId))) {
            ReactionType type = (ReactionType) row[1];
            long count = (Long) row[2];
            breakdown.merge(type == null ? ReactionType.LIKE.name() : type.name(), count, Long::sum);
            total += count;
        }
        String mine = likeRepository.findByPostIdAndUserId(postId, viewerId)
                .map(l -> l.reactionOrLike().name()).orElse(null);
        return new ReactionSummary(total, breakdown, topThree(breakdown), mine);
    }

    private static List<String> topThree(Map<String, Long> breakdown) {
        return breakdown.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();
    }

    // --------------------------------------------------------------- comments ---

    @Transactional
    public CommentDto addComment(Long postId, Long authorId, CreateCommentRequest req) {
        Post post = requirePost(postId);
        scopeService.requireNotBlocked(authorId, post.getAuthor().getId());
        User author = userService.require(authorId);

        Comment parent = null;
        if (req.parentId() != null) {
            parent = commentRepository.findById(req.parentId())
                    .orElseThrow(() -> ApiException.notFound("Comment"));
            if (!parent.getPost().getId().equals(postId)) {
                throw ApiException.badRequest("That comment belongs to a different post");
            }
            // Past the deepest level, a reply joins its parent's thread instead of nesting further.
            while (depthOf(parent) >= MAX_COMMENT_DEPTH && parent.getParent() != null) {
                parent = parent.getParent();
            }
        }

        Comment comment = commentRepository.save(Comment.builder()
                .post(post)
                .author(author)
                .parent(parent)
                .content(req.content().trim())
                .imageUrl(blankToNull(req.imageUrl()))
                .build());

        if (parent == null) {
            notificationService.raise(post.getAuthor(), author, Notification.Type.COMMENT,
                    author.getFullName() + " commented on your post.", "/posts/" + postId, post.getImageUrl());
        } else {
            notificationService.raise(parent.getAuthor(), author, Notification.Type.COMMENT_REPLY,
                    author.getFullName() + " replied to your comment.", "/posts/" + postId, post.getImageUrl());
            if (!Objects.equals(parent.getAuthor().getId(), post.getAuthor().getId())) {
                // The post owner still hears about activity on their own post.
                notificationService.raise(post.getAuthor(), author, Notification.Type.COMMENT,
                        author.getFullName() + " replied on your post.", "/posts/" + postId, post.getImageUrl());
            }
        }

        return toCommentDto(comment, emptySummary(), List.of());
    }

    @Transactional
    public CommentDto editComment(Long commentId, Long userId, String content) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Comment"));
        if (!comment.getAuthor().getId().equals(userId)) {
            throw ApiException.forbidden("You can only edit your own comments");
        }
        comment.setContent(content.trim());
        comment.setEditedAt(Instant.now());
        commentRepository.save(comment);
        return buildCommentTree(List.of(comment), userId).stream().findFirst()
                .orElseGet(() -> toCommentDto(comment, emptySummary(), List.of()));
    }

    /** Deleting a comment removes its whole reply thread with it. */
    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Comment"));
        boolean mine = comment.getAuthor().getId().equals(userId);
        boolean myPost = comment.getPost().getAuthor().getId().equals(userId);
        boolean moderator = comment.getPost().getGroup() != null
                && isGroupModerator(comment.getPost().getGroup().getId(), userId);
        if (!mine && !myPost && !moderator) {
            throw ApiException.forbidden("You can only delete your own comments");
        }

        List<Comment> all = commentRepository.findByPost(comment.getPost().getId());
        Map<Long, List<Comment>> children = new HashMap<>();
        for (Comment c : all) {
            if (c.getParent() != null) {
                children.computeIfAbsent(c.getParent().getId(), key -> new ArrayList<>()).add(c);
            }
        }
        List<Comment> doomed = new ArrayList<>();
        collectPostOrder(comment, children, doomed);

        commentLikeRepository.deleteByCommentIds(doomed.stream().map(Comment::getId).toList());
        doomed.forEach(commentRepository::delete);
    }

    /** Sets, switches or clears a reaction on a comment, like a post. */
    @Transactional
    public CommentDto reactToComment(Long commentId, Long userId, String reactionRaw) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Comment"));
        ReactionType wanted = ReactionType.parse(reactionRaw);

        Optional<CommentLike> existing = commentLikeRepository.findByCommentIdAndUserId(commentId, userId);
        if (existing.isPresent()) {
            CommentLike row = existing.get();
            if (row.getReaction() == wanted) {
                commentLikeRepository.delete(row);
            } else {
                row.setReaction(wanted);
                commentLikeRepository.save(row);
            }
        } else {
            User user = userService.require(userId);
            commentLikeRepository.save(CommentLike.builder().comment(comment).user(user).reaction(wanted).build());
            notificationService.raise(comment.getAuthor(), user, Notification.Type.COMMENT_REACTION,
                    user.getFullName() + " reacted " + wanted.getEmoji() + " to your comment.",
                    "/posts/" + comment.getPost().getId(), null);
        }
        commentLikeRepository.flush();

        CommentSummaries summaries = commentSummaries(List.of(commentId), userId);
        return toCommentDto(comment, summaries.of(commentId), List.of());
    }

    /** The plain Like on a comment: clears any reaction you had, otherwise likes. */
    @Transactional
    public CommentDto toggleCommentLike(Long commentId, Long userId) {
        Optional<CommentLike> existing = commentLikeRepository.findByCommentIdAndUserId(commentId, userId);
        String reaction = existing.map(l -> l.getReaction().name()).orElse(ReactionType.LIKE.name());
        return reactToComment(commentId, userId, reaction);
    }

    @Transactional(readOnly = true)
    public List<CommentDto> comments(Long postId, Long viewerId) {
        return buildCommentTree(commentRepository.findByPost(postId), viewerId);
    }

    // ------------------------------------------------------------------ saved ---

    /** Returns true when the post is saved after the call. */
    @Transactional
    public boolean toggleSave(Long postId, Long userId) {
        Post post = requirePost(postId);
        Optional<SavedPost> existing = savedPostRepository.findByUserIdAndPostId(userId, postId);
        if (existing.isPresent()) {
            savedPostRepository.delete(existing.get());
            return false;
        }
        savedPostRepository.save(SavedPost.builder().user(userService.require(userId)).post(post).build());
        return true;
    }

    @Transactional(readOnly = true)
    public long savedCount(Long userId) {
        return savedPostRepository.countByUserId(userId);
    }

    // ---------------------------------------------------------------- ranking ---

    /**
     * Top Stories: engagement (reactions, comments, shares) and closeness (Close
     * Friends up, Acquaintances down, posts on your own wall up), divided by age
     * so fresh posts still surface.
     */
    private List<Post> rank(List<Post> candidates, Long viewerId) {
        if (candidates.size() < 2) return candidates;
        List<Long> ids = candidates.stream().map(Post::getId).toList();

        Map<Long, Long> reactions = toCountMap(likeRepository.countByPostIds(ids));
        Map<Long, Long> comments = toCountMap(commentRepository.countByPostIds(ids));
        Map<Long, Long> shares = toCountMap(postRepository.countShares(ids));
        Set<Long> close = new HashSet<>(friendListRepository.findMemberIds(viewerId, FriendList.Kind.CLOSE_FRIENDS));
        Set<Long> distant = new HashSet<>(friendListRepository.findMemberIds(viewerId, FriendList.Kind.ACQUAINTANCES));

        Instant now = Instant.now();
        Map<Long, Double> scores = new HashMap<>();
        for (Post p : candidates) {
            Long authorId = p.getAuthor().getId();
            double affinity = 0;
            if (close.contains(authorId)) affinity += 1.5;
            if (distant.contains(authorId)) affinity -= 0.6;
            if (authorId.equals(viewerId)) affinity += 0.3;
            if (p.getWallOwner() != null && p.getWallOwner().getId().equals(viewerId)) affinity += 1.0;

            double engagement = 0.6 * Math.log1p(reactions.getOrDefault(p.getId(), 0L))
                    + 0.9 * Math.log1p(comments.getOrDefault(p.getId(), 0L))
                    + 1.2 * Math.log1p(shares.getOrDefault(p.getId(), 0L));
            double hours = Math.max(0, Duration.between(p.getCreatedAt(), now).toMinutes() / 60.0);
            scores.put(p.getId(), (1 + engagement + affinity) / Math.pow(hours + 2, 1.1));
        }

        List<Post> ranked = new ArrayList<>(candidates);
        ranked.sort(Comparator.comparingDouble((Post p) -> scores.get(p.getId())).reversed());
        return ranked;
    }

    private static Map<Long, Long> toCountMap(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1], Long::sum));
    }

    // ------------------------------------------------------------- decoration ---

    /**
     * Turns entities into DTOs with a fixed number of queries: reactions, my
     * reactions, comments, comment reactions, saves, share counts and my group
     * roles.
     */
    private List<PostDto> decorate(List<Post> posts, Long viewerId) {
        if (posts.isEmpty()) return List.of();

        List<Long> ids = posts.stream().map(Post::getId).toList();

        Map<Long, Map<String, Long>> breakdowns = new HashMap<>();
        Map<Long, Long> totals = new HashMap<>();
        for (Object[] row : likeRepository.countByPostIdsGrouped(ids)) {
            Long postId = (Long) row[0];
            ReactionType type = (ReactionType) row[1];
            long count = (Long) row[2];
            breakdowns.computeIfAbsent(postId, key -> new LinkedHashMap<>())
                    .merge(type == null ? ReactionType.LIKE.name() : type.name(), count, Long::sum);
            totals.merge(postId, count, Long::sum);
        }

        Map<Long, String> myReactions = new HashMap<>();
        for (Object[] row : likeRepository.findMyReactions(viewerId, ids)) {
            ReactionType type = (ReactionType) row[1];
            myReactions.put((Long) row[0], (type == null ? ReactionType.LIKE : type).name());
        }

        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        Map<Long, List<Comment>> commentsByPost = commentRepository.findByPostIds(ids).stream()
                .filter(c -> !hidden.contains(c.getAuthor().getId()))
                .collect(Collectors.groupingBy(c -> c.getPost().getId()));
        List<Long> allCommentIds = commentsByPost.values().stream().flatMap(List::stream).map(Comment::getId).toList();
        CommentSummaries commentSummaries = commentSummaries(allCommentIds, viewerId);

        Set<Long> saved = new HashSet<>(savedPostRepository.findSavedPostIds(viewerId, ids));

        Map<Long, Long> shareCounts = toCountMap(postRepository.countShares(ids));

        List<Long> groupIds = posts.stream().filter(p -> p.getGroup() != null)
                .map(p -> p.getGroup().getId()).distinct().toList();
        Map<Long, GroupMember.Role> myRoles = new HashMap<>();
        if (!groupIds.isEmpty()) {
            for (Object[] row : groupMemberRepository.findRoles(viewerId, groupIds)) {
                myRoles.put((Long) row[0], (GroupMember.Role) row[1]);
            }
        }

        return posts.stream().map(post -> {
            Map<String, Long> breakdown = breakdowns.getOrDefault(post.getId(), Map.of());
            ReactionSummary reactions = new ReactionSummary(
                    totals.getOrDefault(post.getId(), 0L),
                    breakdown,
                    topThree(breakdown),
                    myReactions.get(post.getId()));

            List<Comment> flat = commentsByPost.getOrDefault(post.getId(), List.of());
            List<CommentDto> tree = assembleTree(flat, commentSummaries);

            GroupMember.Role role = post.getGroup() == null ? null : myRoles.get(post.getGroup().getId());
            boolean isAuthor = post.getAuthor().getId().equals(viewerId);
            boolean customAudience = post.getPrivacy() == Post.Privacy.FRIENDS_EXCEPT
                    || post.getPrivacy() == Post.Privacy.SPECIFIC;

            return new PostDto(
                    post.getId(),
                    UserDto.summary(post.getAuthor()),
                    post.getContent(),
                    post.getImageUrl(),
                    post.getVideoUrl(),
                    post.getFeeling(),
                    post.getLocation(),
                    post.getPrivacy().name(),
                    post.getCreatedAt(),
                    post.getEditedAt(),
                    reactions,
                    flat.size(),
                    shareCounts.getOrDefault(post.getId(), 0L),
                    saved.contains(post.getId()),
                    tree,
                    post.getTaggedUsers().stream().map(UserDto::summary).toList(),
                    groupRef(post.getGroup()),
                    embed(post.getSharedPost()),
                    post.getWallOwner() == null ? null : UserDto.summary(post.getWallOwner()),
                    pageRef(post.getPage()),
                    post.isPinned(),
                    post.isPending(),
                    isAuthor,
                    canDelete(post, viewerId, role),
                    canPin(post, viewerId, role),
                    isAuthor && customAudience
                            ? post.getAudience().stream().map(UserDto::summary).toList()
                            : List.of());
        }).toList();
    }

    private static boolean canDelete(Post post, Long viewerId, GroupMember.Role role) {
        if (post.getAuthor().getId().equals(viewerId)) return true;
        if (post.getWallOwner() != null && post.getWallOwner().getId().equals(viewerId)) return true;
        if (post.getPage() != null && post.getPage().getOwner().getId().equals(viewerId)) return true;
        return role != null && role != GroupMember.Role.MEMBER;
    }

    private static boolean canPin(Post post, Long viewerId, GroupMember.Role role) {
        if (post.isPending()) return false;
        if (post.getGroup() != null) return role != null && role != GroupMember.Role.MEMBER;
        if (post.getPage() != null) return post.getPage().getOwner().getId().equals(viewerId);
        if (post.getWallOwner() != null) return post.getWallOwner().getId().equals(viewerId);
        return post.getAuthor().getId().equals(viewerId);
    }

    private GroupMember.Role groupRoleOf(Post post, Long userId) {
        if (post.getGroup() == null) return null;
        return groupMemberRepository.findByGroupIdAndUserId(post.getGroup().getId(), userId)
                .map(GroupMember::getRole).orElse(null);
    }

    private boolean isGroupModerator(Long groupId, Long userId) {
        return groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .map(m -> m.getRole() != GroupMember.Role.MEMBER)
                .orElse(false);
    }

    private void requireGroupModerator(Long groupId, Long userId) {
        if (!isGroupModerator(groupId, userId)) {
            throw ApiException.forbidden("Only group admins and moderators can do that");
        }
    }

    private Post requirePost(Long postId) {
        return postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("Post"));
    }

    private static GroupRefDto groupRef(SocialGroup group) {
        return group == null ? null : new GroupRefDto(group.getId(), group.getName(), group.getCoverUrl());
    }

    static PageRefDto pageRef(FbPage page) {
        return page == null ? null : new PageRefDto(page.getId(), page.getName(), page.getAvatarUrl(), page.getCategory());
    }

    /**
     * The card inside a shared post. It deliberately carries no counts of its
     * own - the real product does not show the original's likes on the re-share.
     */
    private static PostDto embed(Post original) {
        if (original == null) return null;
        return new PostDto(
                original.getId(),
                UserDto.summary(original.getAuthor()),
                original.getContent(),
                original.getImageUrl(),
                original.getVideoUrl(),
                original.getFeeling(),
                original.getLocation(),
                original.getPrivacy().name(),
                original.getCreatedAt(),
                original.getEditedAt(),
                emptySummary(),
                0, 0, false, List.of(), List.of(), null, null,
                null, pageRef(original.getPage()), false, false, false, false, false, List.of());
    }

    // ------------------------------------------------------------ comment tree ---

    /** Reaction breakdowns for a batch of comments, and which one is mine. */
    private record CommentSummaries(Map<Long, Map<String, Long>> breakdowns, Map<Long, String> mine) {
        ReactionSummary of(Long commentId) {
            Map<String, Long> breakdown = breakdowns.getOrDefault(commentId, Map.of());
            long total = breakdown.values().stream().mapToLong(Long::longValue).sum();
            return new ReactionSummary(total, breakdown, topThree(breakdown), mine.get(commentId));
        }
    }

    private CommentSummaries commentSummaries(List<Long> commentIds, Long viewerId) {
        if (commentIds.isEmpty()) return new CommentSummaries(Map.of(), Map.of());
        Map<Long, Map<String, Long>> breakdowns = new HashMap<>();
        for (Object[] row : commentLikeRepository.countByCommentIdsGrouped(commentIds)) {
            ReactionType type = (ReactionType) row[1];
            breakdowns.computeIfAbsent((Long) row[0], key -> new LinkedHashMap<>())
                    .merge(type == null ? ReactionType.LIKE.name() : type.name(), (Long) row[2], Long::sum);
        }
        Map<Long, String> mine = new HashMap<>();
        for (Object[] row : commentLikeRepository.findMyReactions(viewerId, commentIds)) {
            ReactionType type = (ReactionType) row[1];
            mine.put((Long) row[0], (type == null ? ReactionType.LIKE : type).name());
        }
        return new CommentSummaries(breakdowns, mine);
    }

    private List<CommentDto> buildCommentTree(List<Comment> flat, Long viewerId) {
        if (flat.isEmpty()) return List.of();
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        List<Comment> visible = flat.stream().filter(c -> !hidden.contains(c.getAuthor().getId())).toList();
        CommentSummaries summaries = commentSummaries(visible.stream().map(Comment::getId).toList(), viewerId);
        return assembleTree(visible, summaries);
    }

    /** Flat rows (oldest first) into a nested tree. Orphans of hidden parents become top-level. */
    private static List<CommentDto> assembleTree(List<Comment> flat, CommentSummaries summaries) {
        if (flat.isEmpty()) return List.of();
        Set<Long> present = flat.stream().map(Comment::getId).collect(Collectors.toSet());
        Map<Long, List<Comment>> children = new HashMap<>();
        List<Comment> roots = new ArrayList<>();
        for (Comment c : flat) {
            if (c.getParent() != null && present.contains(c.getParent().getId())) {
                children.computeIfAbsent(c.getParent().getId(), key -> new ArrayList<>()).add(c);
            } else {
                roots.add(c);
            }
        }
        return roots.stream().map(c -> toTree(c, children, summaries)).toList();
    }

    private static CommentDto toTree(Comment c, Map<Long, List<Comment>> children, CommentSummaries summaries) {
        List<CommentDto> replies = children.getOrDefault(c.getId(), List.of()).stream()
                .map(child -> toTree(child, children, summaries))
                .toList();
        return toCommentDto(c, summaries.of(c.getId()), replies);
    }

    private static CommentDto toCommentDto(Comment c, ReactionSummary reactions, List<CommentDto> replies) {
        return new CommentDto(
                c.getId(),
                UserDto.summary(c.getAuthor()),
                c.getContent(),
                c.getImageUrl(),
                c.getParent() == null ? null : c.getParent().getId(),
                c.getCreatedAt(),
                c.getEditedAt(),
                reactions.total(),
                reactions.myReaction() != null,
                reactions,
                replies);
    }

    private static int depthOf(Comment comment) {
        int depth = 0;
        Comment cursor = comment.getParent();
        while (cursor != null && depth < 20) {
            depth++;
            cursor = cursor.getParent();
        }
        return depth;
    }

    private static void collectPostOrder(Comment node, Map<Long, List<Comment>> children, List<Comment> out) {
        for (Comment child : children.getOrDefault(node.getId(), List.of())) {
            collectPostOrder(child, children, out);
        }
        out.add(node);
    }

    private static ReactionSummary emptySummary() {
        return new ReactionSummary(0, Map.of(), List.of(), null);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private static boolean withinDaysOfAnniversary(Instant then, int days) {
        long daysBetween = ChronoUnit.DAYS.between(then, Instant.now());
        long offset = daysBetween % 365;
        return offset <= days || offset >= 365 - days;
    }
}
