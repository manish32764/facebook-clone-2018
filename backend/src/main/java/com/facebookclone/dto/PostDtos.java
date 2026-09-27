package com.facebookclone.dto;

import com.facebookclone.entity.Post;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class PostDtos {

    private PostDtos() {}

    public record CreatePostRequest(
            @Size(max = 5000) String content,
            String imageUrl,
            String videoUrl,
            String feeling,
            String location,
            String privacy,
            /** Publish into a group instead of onto your timeline. */
            Long groupId,
            /** "— with ..." */
            List<Long> tagUserIds,
            /** Write on a friend's timeline rather than your own. */
            Long wallOwnerId,
            /** Publish as a Page you own. */
            Long pageId,
            /** Who is left out (FRIENDS_EXCEPT) or the only people included (SPECIFIC). */
            List<Long> audienceUserIds
    ) {}

    public record UpdatePostRequest(
            @Size(max = 5000) String content,
            String feeling,
            String location,
            String privacy,
            List<Long> audienceUserIds
    ) {}

    public record SharePostRequest(@Size(max = 5000) String content, String privacy) {}

    public record CreateCommentRequest(
            @NotBlank @Size(max = 2000) String content,
            String imageUrl,
            /** Set to reply to an existing comment. */
            Long parentId
    ) {}

    public record UpdateCommentRequest(@NotBlank @Size(max = 2000) String content) {}

    public record CommentDto(
            Long id,
            UserDto author,
            String content,
            String imageUrl,
            Long parentId,
            Instant createdAt,
            Instant editedAt,
            long likeCount,
            boolean likedByMe,
            ReactionSummary reactions,
            List<CommentDto> replies
    ) {}

    /** The little face stack under a post: how many of each reaction, and mine. */
    public record ReactionSummary(
            long total,
            /** Reaction name to count, only the ones actually used. */
            Map<String, Long> breakdown,
            /** The three most-used reactions, highest first. */
            List<String> top,
            String myReaction
    ) {}

    public record ReactionResponse(Long postId, ReactionSummary reactions) {}

    public record ReactorDto(UserDto user, String reaction) {}

    public record PostDto(
            Long id,
            UserDto author,
            String content,
            String imageUrl,
            String videoUrl,
            String feeling,
            String location,
            String privacy,
            Instant createdAt,
            Instant editedAt,
            ReactionSummary reactions,
            long commentCount,
            long shareCount,
            boolean savedByMe,
            List<CommentDto> comments,
            List<UserDto> taggedUsers,
            /** Set when the post lives in a group. */
            GroupDtos.GroupRefDto group,
            /** The original post, when this one is a re-share. */
            PostDto sharedPost,
            /** Whose timeline it was written on, when that is not the author's. */
            UserDto wallOwner,
            /** Set when the post was published as a Page. */
            PageDtos.PageRefDto page,
            boolean pinned,
            /** Waiting for a group admin. */
            boolean pending,
            boolean canEdit,
            boolean canDelete,
            boolean canPin,
            /** Only sent to the author: the people a custom audience names. */
            List<UserDto> audience
    ) {}

    public static Post.Privacy parsePrivacy(String raw) {
        if (raw == null || raw.isBlank()) return Post.Privacy.PUBLIC;
        try {
            return Post.Privacy.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Post.Privacy.PUBLIC;
        }
    }
}
