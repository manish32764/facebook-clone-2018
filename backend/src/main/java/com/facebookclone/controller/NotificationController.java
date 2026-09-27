package com.facebookclone.controller;

import com.facebookclone.dto.MessageDtos.UnreadCountsDto;
import com.facebookclone.dto.NotificationDtos.NotificationPageDto;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.FriendService;
import com.facebookclone.service.MessageService;
import com.facebookclone.service.NotificationService;
import com.facebookclone.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final MessageService messageService;
    private final FriendService friendService;
    private final PresenceService presenceService;

    @GetMapping
    public NotificationPageDto list(@CurrentUser AppUserPrincipal me,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return notificationService.list(me.getId(), page, Math.min(size, 50));
    }

    /**
     * The three chrome badges in one call, and the presence heartbeat rides along
     * with it - the client polls this anyway, so nothing needs a second timer.
     */
    @GetMapping("/counts")
    public UnreadCountsDto counts(@CurrentUser AppUserPrincipal me) {
        presenceService.heartbeat(me.getId());
        return new UnreadCountsDto(
                messageService.unreadCount(me.getId()),
                notificationService.unreadCount(me.getId()),
                friendService.incomingRequests(me.getId()).size());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        notificationService.markRead(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@CurrentUser AppUserPrincipal me) {
        notificationService.markAllRead(me.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        notificationService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }
}
