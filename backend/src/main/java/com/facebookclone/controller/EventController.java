package com.facebookclone.controller;

import com.facebookclone.dto.EventDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public List<EventDto> upcoming(@CurrentUser AppUserPrincipal me) {
        return eventService.upcoming(me.getId());
    }

    @GetMapping("/past")
    public List<EventDto> past(@CurrentUser AppUserPrincipal me) {
        return eventService.past(me.getId());
    }

    @GetMapping("/mine")
    public List<EventDto> mine(@CurrentUser AppUserPrincipal me) {
        return eventService.mine(me.getId());
    }

    @GetMapping("/invites")
    public List<EventInviteDto> invites(@CurrentUser AppUserPrincipal me) {
        return eventService.invites(me.getId());
    }

    @GetMapping("/{id}")
    public EventDto one(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return eventService.one(id, me.getId());
    }

    @GetMapping("/{id}/attendees")
    public List<AttendeeDto> attendees(@PathVariable Long id) {
        return eventService.attendees(id);
    }

    @GetMapping("/{id}/invited")
    public List<Long> invited(@PathVariable Long id) {
        return eventService.invitedIds(id);
    }

    @PostMapping
    public ResponseEntity<EventDto> create(@CurrentUser AppUserPrincipal me,
                                           @Valid @RequestBody CreateEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.create(me.getId(), request));
    }

    @PatchMapping("/{id}")
    public EventDto update(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                           @Valid @RequestBody UpdateEventRequest request) {
        return eventService.update(id, me.getId(), request);
    }

    @PostMapping("/{id}/invite")
    public Map<String, Integer> invite(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                       @RequestBody InviteRequest request) {
        return Map.of("sent", eventService.invite(id, me.getId(), request.userIds()));
    }

    @PostMapping("/{id}/respond")
    public EventDto respond(@PathVariable Long id,
                            @CurrentUser AppUserPrincipal me,
                            @RequestBody RespondRequest request) {
        return eventService.respond(id, me.getId(), request.status());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        eventService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }
}
