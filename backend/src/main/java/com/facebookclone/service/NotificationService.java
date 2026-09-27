package com.facebookclone.service;

import com.facebookclone.dto.NotificationDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.Notification;
import com.facebookclone.entity.User;
import com.facebookclone.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * Raises and reads the bell list. Every write goes through {@link #raise} so no
 * caller can leave a notification addressed to the person who caused it.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /** Ignored when the actor is the recipient - you do not notify yourself. */
    @Transactional
    public void raise(User recipient, User actor, Notification.Type type,
                      String text, String link, String imageUrl) {
        if (recipient == null) return;
        if (actor != null && Objects.equals(recipient.getId(), actor.getId())) return;

        notificationRepository.save(Notification.builder()
                .recipient(recipient)
                .actor(actor)
                .type(type)
                .text(text)
                .link(link)
                .imageUrl(imageUrl)
                .build());
    }

    @Transactional(readOnly = true)
    public NotificationPageDto list(Long userId, int page, int size) {
        Page<Notification> found = notificationRepository.findForUser(userId, PageRequest.of(page, size));
        List<NotificationDto> items = found.getContent().stream().map(NotificationService::toDto).toList();
        return new NotificationPageDto(items, notificationRepository.countByRecipientIdAndReadFalse(userId),
                found.hasNext());
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId)
                .filter(n -> n.getRecipient().getId().equals(userId))
                .ifPresent(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                });
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllRead(userId);
    }

    @Transactional
    public void delete(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId)
                .filter(n -> n.getRecipient().getId().equals(userId))
                .ifPresent(notificationRepository::delete);
    }

    private static NotificationDto toDto(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getType().name(),
                n.getActor() == null ? null : UserDto.summary(n.getActor()),
                n.getText(),
                n.getLink(),
                n.getImageUrl(),
                n.isRead(),
                n.getCreatedAt());
    }
}
