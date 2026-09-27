package com.facebookclone.controller;

import com.facebookclone.dto.StoryDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.StoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @GetMapping
    public List<StoryReelDto> reels(@CurrentUser AppUserPrincipal me) {
        return storyService.reels(me.getId());
    }

    @GetMapping("/archive")
    public List<StoryDto> archive(@CurrentUser AppUserPrincipal me) {
        return storyService.archive(me.getId());
    }

    @PostMapping
    public ResponseEntity<StoryDto> create(@CurrentUser AppUserPrincipal me,
                                           @Valid @RequestBody CreateStoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(storyService.create(me.getId(), request));
    }

    @PostMapping("/{id}/seen")
    public ResponseEntity<Void> markSeen(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        storyService.markSeen(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/react")
    public ResponseEntity<Void> react(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                      @Valid @RequestBody ReactRequest request) {
        storyService.react(id, me.getId(), request.emoji());
        return ResponseEntity.noContent().build();
    }

    /** Sends the reply to the author in Messenger; returns the conversation it landed in. */
    @PostMapping("/{id}/reply")
    public Map<String, Long> reply(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                   @Valid @RequestBody ReplyRequest request) {
        return Map.of("conversationId", storyService.reply(id, me.getId(), request.content()));
    }

    @GetMapping("/{id}/viewers")
    public List<StoryViewerDto> viewers(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return storyService.viewers(id, me.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        storyService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------- highlights ---

    @GetMapping("/highlights/user/{userId}")
    public List<HighlightDto> highlights(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return storyService.highlights(userId, me.getId());
    }

    @PostMapping("/highlights")
    public ResponseEntity<HighlightDto> createHighlight(@CurrentUser AppUserPrincipal me,
                                                        @Valid @RequestBody HighlightRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(storyService.createHighlight(me.getId(), request));
    }

    @PatchMapping("/highlights/{id}")
    public HighlightDto updateHighlight(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                        @Valid @RequestBody HighlightRequest request) {
        return storyService.updateHighlight(me.getId(), id, request);
    }

    @DeleteMapping("/highlights/{id}")
    public ResponseEntity<Void> deleteHighlight(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        storyService.deleteHighlight(me.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
