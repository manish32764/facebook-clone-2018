package com.facebookclone.controller;

import com.facebookclone.dto.MessageDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/conversations")
    public List<ConversationDto> conversations(@CurrentUser AppUserPrincipal me) {
        return messageService.conversations(me.getId());
    }

    @GetMapping("/conversations/{id}")
    public ThreadDto thread(@PathVariable Long id,
                            @CurrentUser AppUserPrincipal me,
                            @RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "30") int size) {
        return messageService.thread(id, me.getId(), page, Math.min(size, 100));
    }

    /** Opens (or reuses) the direct thread with one person. */
    @PostMapping("/with/{userId}")
    public ConversationDto openDirect(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return messageService.openDirect(me.getId(), userId);
    }

    @PostMapping("/conversations")
    public ResponseEntity<ConversationDto> createGroup(@CurrentUser AppUserPrincipal me,
                                                       @Valid @RequestBody CreateConversationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messageService.createGroup(me.getId(), request));
    }

    @PostMapping("/conversations/{id}")
    public ResponseEntity<MessageDto> send(@PathVariable Long id,
                                           @CurrentUser AppUserPrincipal me,
                                           @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messageService.send(id, me.getId(), request));
    }

    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        messageService.markRead(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/conversations/{id}/typing")
    public ResponseEntity<Void> setTyping(@PathVariable Long id,
                                          @CurrentUser AppUserPrincipal me,
                                          @RequestBody TypingRequest request) {
        messageService.setTyping(id, me.getId(), request.typing());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/conversations/{id}/typing")
    public TypingStateDto typingState(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return messageService.typingState(id, me.getId());
    }

    @PostMapping("/conversations/{id}/mute")
    public ResponseEntity<Void> mute(@PathVariable Long id,
                                     @CurrentUser AppUserPrincipal me,
                                     @RequestBody Map<String, Boolean> body) {
        messageService.setMuted(id, me.getId(), Boolean.TRUE.equals(body.get("muted")));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> leave(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        messageService.leave(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{messageId}/react")
    public MessageDto react(@PathVariable Long messageId,
                            @CurrentUser AppUserPrincipal me,
                            @RequestBody Map<String, String> body) {
        return messageService.react(messageId, me.getId(), body.get("emoji"));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> unsend(@PathVariable Long messageId, @CurrentUser AppUserPrincipal me) {
        messageService.unsend(messageId, me.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public List<MessageDto> search(@RequestParam("q") String query, @CurrentUser AppUserPrincipal me) {
        return messageService.search(query, me.getId(), 30);
    }
}
