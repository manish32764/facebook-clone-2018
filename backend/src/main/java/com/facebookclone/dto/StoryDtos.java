package com.facebookclone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class StoryDtos {

    private StoryDtos() {}

    public record CreateStoryRequest(
            String imageUrl,
            @Size(max = 280) String text,
            String backgroundColor,
            /** JSON array of text and sticker layers, owned by the client. */
            @Size(max = 8000) String overlays,
            /** PUBLIC, FRIENDS or CLOSE_FRIENDS */
            String audience
    ) {}

    public record StoryDto(
            Long id,
            String imageUrl,
            String text,
            String backgroundColor,
            Instant createdAt,
            Instant expiresAt,
            boolean seen,
            long viewCount,
            String overlays,
            String audience,
            long reactionCount
    ) {}

    /** The rail shows one tile per author; opening it plays that author's reel. */
    public record StoryReelDto(UserDto author, List<StoryDto> stories, boolean allSeen) {}

    public record ReactRequest(@NotBlank @Size(max = 16) String emoji) {}

    public record ReplyRequest(@NotBlank @Size(max = 1000) String content) {}

    /** One row in "Seen by": who, when, and any reactions they sent. */
    public record StoryViewerDto(UserDto user, Instant viewedAt, List<String> reactions) {}

    public record HighlightRequest(@Size(max = 60) String title, List<Long> storyIds) {}

    public record HighlightDto(Long id, String title, String coverUrl, UserDto owner, List<StoryDto> stories) {}
}
