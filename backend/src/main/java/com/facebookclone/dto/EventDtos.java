package com.facebookclone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class EventDtos {

    private EventDtos() {}

    public record CreateEventRequest(
            @NotBlank @Size(max = 160) String name,
            @Size(max = 4000) String description,
            String coverUrl,
            String location,
            @NotNull Instant startsAt,
            Instant endsAt,
            boolean online,
            /** Friends to invite straight away. */
            List<Long> inviteUserIds
    ) {}

    /** Every field optional: only the ones sent are changed. */
    public record UpdateEventRequest(
            @Size(max = 160) String name,
            @Size(max = 4000) String description,
            String coverUrl,
            String location,
            Instant startsAt,
            Instant endsAt,
            Boolean online,
            /** Set to clear the end time. */
            Boolean clearEnd
    ) {}

    public record EventDto(
            Long id,
            String name,
            String description,
            String coverUrl,
            String location,
            Instant startsAt,
            Instant endsAt,
            boolean online,
            UserDto host,
            long goingCount,
            long interestedCount,
            /** GOING, INTERESTED, NOT_GOING, or null when you have not replied. */
            String myStatus,
            long invitedCount
    ) {}

    public record AttendeeDto(UserDto user, String status) {}

    public record RespondRequest(String status) {}

    public record InviteRequest(List<Long> userIds) {}

    public record EventInviteDto(EventDto event, UserDto inviter, Instant createdAt) {}
}
