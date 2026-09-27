package com.facebookclone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class PageDtos {

    private PageDtos() {}

    /** The compact reference a Page post or ad carries in its header. */
    public record PageRefDto(Long id, String name, String avatarUrl, String category) {}

    public record PageRequest(
            @NotBlank @Size(max = 140) String name,
            @NotBlank @Size(max = 80) String category,
            @Size(max = 4000) String description,
            String avatarUrl,
            String coverUrl,
            String website,
            String phone,
            String location
    ) {}

    public record PageDto(
            Long id,
            String name,
            String category,
            String description,
            String avatarUrl,
            String coverUrl,
            String website,
            String phone,
            String location,
            UserDto owner,
            long likeCount,
            long followerCount,
            boolean liked,
            boolean following,
            /** You own the Page and can post as it. */
            boolean mine,
            /** Share of reviews that recommend the Page, 0-100, or null with no reviews. */
            Integer recommendPercent,
            long reviewCount,
            Instant createdAt
    ) {}

    public record ReviewRequest(boolean recommends, @Size(max = 2000) String content) {}

    public record ReviewDto(Long id, UserDto author, boolean recommends, String content, Instant createdAt) {}
}
