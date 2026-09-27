package com.facebookclone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/** Blocking, reporting, following, friend lists and pokes. */
public final class SocialDtos {

    private SocialDtos() {}

    public record BlockedDto(UserDto user, Instant blockedAt) {}

    public record ReportRequest(
            @NotBlank String targetType,
            Long targetId,
            @NotBlank @Size(max = 60) String reason,
            @Size(max = 2000) String details
    ) {}

    public record ReportDto(
            Long id,
            String targetType,
            Long targetId,
            String targetLabel,
            String reason,
            String details,
            String status,
            Instant createdAt
    ) {}

    public record FollowStateDto(boolean following, long followerCount, long followingCount) {}

    public record FriendListDto(
            Long id,
            String name,
            /** CLOSE_FRIENDS, ACQUAINTANCES or CUSTOM */
            String kind,
            List<UserDto> members
    ) {}

    public record FriendListRequest(@NotBlank @Size(max = 80) String name) {}

    public record PokeDto(Long id, UserDto user, int count, Instant lastPokedAt) {}
}
