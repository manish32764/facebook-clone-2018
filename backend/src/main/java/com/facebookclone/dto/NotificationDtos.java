package com.facebookclone.dto;

import java.time.Instant;
import java.util.List;

public final class NotificationDtos {

    private NotificationDtos() {}

    public record NotificationDto(
            Long id,
            String type,
            UserDto actor,
            String text,
            String link,
            String imageUrl,
            boolean read,
            Instant createdAt
    ) {}

    public record NotificationPageDto(List<NotificationDto> items, long unreadCount, boolean hasMore) {}
}
