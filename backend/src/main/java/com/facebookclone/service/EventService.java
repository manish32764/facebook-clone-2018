package com.facebookclone.service;

import com.facebookclone.dto.EventDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.EventAttendeeRepository;
import com.facebookclone.repository.EventInviteRepository;
import com.facebookclone.repository.EventRepository;
import com.facebookclone.repository.FriendshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventAttendeeRepository attendeeRepository;
    private final EventInviteRepository inviteRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<EventDto> upcoming(Long viewerId) {
        return decorate(eventRepository.findUpcoming(Instant.now()), viewerId);
    }

    @Transactional(readOnly = true)
    public List<EventDto> past(Long viewerId) {
        return decorate(eventRepository.findPast(Instant.now()), viewerId);
    }

    /** Everything you said you were going to or interested in. */
    @Transactional(readOnly = true)
    public List<EventDto> mine(Long viewerId) {
        return decorate(eventRepository.findResponded(viewerId), viewerId);
    }

    /** Upcoming events someone invited you to that you have not answered yet. */
    @Transactional(readOnly = true)
    public List<EventInviteDto> invites(Long viewerId) {
        return inviteRepository.findOpenInvites(viewerId, Instant.now()).stream()
                .map(i -> new EventInviteDto(decorate(List.of(i.getEvent()), viewerId).get(0),
                        UserDto.summary(i.getInviter()), i.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public EventDto one(Long eventId, Long viewerId) {
        return decorate(List.of(require(eventId)), viewerId).get(0);
    }

    @Transactional(readOnly = true)
    public List<AttendeeDto> attendees(Long eventId) {
        return attendeeRepository.findAttendees(eventId).stream()
                .map(a -> new AttendeeDto(UserDto.summary(a.getUser()), a.getStatus().name()))
                .toList();
    }

    /** Ids already invited, so the invite dialog can grey them out. */
    @Transactional(readOnly = true)
    public List<Long> invitedIds(Long eventId) {
        return inviteRepository.findInviteeIds(eventId);
    }

    @Transactional(readOnly = true)
    public List<EventDto> search(String query, Long viewerId) {
        if (query == null || query.trim().length() < 2) return List.of();
        return decorate(eventRepository.search(query.trim()), viewerId);
    }

    /** Creating an event marks the host as going and invites whoever they picked. */
    @Transactional
    public EventDto create(Long userId, CreateEventRequest req) {
        if (req.endsAt() != null && req.endsAt().isBefore(req.startsAt())) {
            throw ApiException.badRequest("An event cannot end before it starts");
        }
        User host = userService.require(userId);
        Event event = eventRepository.save(Event.builder()
                .name(req.name().trim())
                .description(req.description() == null ? null : req.description().trim())
                .coverUrl(blankToNull(req.coverUrl()))
                .location(blankToNull(req.location()))
                .startsAt(req.startsAt())
                .endsAt(req.endsAt())
                .online(req.online())
                .host(host)
                .build());

        attendeeRepository.save(EventAttendee.builder()
                .event(event).user(host).status(EventAttendee.Status.GOING).build());

        if (req.inviteUserIds() != null) invite(event.getId(), userId, req.inviteUserIds());

        return decorate(List.of(event), userId).get(0);
    }

    /** Hosts edit their event; everyone who replied hears about it. */
    @Transactional
    public EventDto update(Long eventId, Long userId, UpdateEventRequest req) {
        Event event = require(eventId);
        if (!event.getHost().getId().equals(userId)) {
            throw ApiException.forbidden("Only the host can edit an event");
        }

        if (req.name() != null && !req.name().isBlank()) event.setName(req.name().trim());
        if (req.description() != null) event.setDescription(blankToNull(req.description()));
        if (req.coverUrl() != null) event.setCoverUrl(blankToNull(req.coverUrl()));
        if (req.location() != null) event.setLocation(blankToNull(req.location()));
        if (req.startsAt() != null) event.setStartsAt(req.startsAt());
        if (req.endsAt() != null) event.setEndsAt(req.endsAt());
        if (Boolean.TRUE.equals(req.clearEnd())) event.setEndsAt(null);
        if (req.online() != null) event.setOnline(req.online());
        if (event.getEndsAt() != null && event.getEndsAt().isBefore(event.getStartsAt())) {
            throw ApiException.badRequest("An event cannot end before it starts");
        }
        Event saved = eventRepository.save(event);

        User host = event.getHost();
        for (EventAttendee attendee : attendeeRepository.findAttendees(eventId)) {
            if (attendee.getStatus() == EventAttendee.Status.NOT_GOING) continue;
            notificationService.raise(attendee.getUser(), host, Notification.Type.EVENT_UPDATED,
                    host.getFullName() + " updated " + saved.getName() + ".",
                    "/events/" + eventId, saved.getCoverUrl());
        }
        return decorate(List.of(saved), userId).get(0);
    }

    /** Anyone going or interested can invite their friends. Returns how many invites went out. */
    @Transactional
    public int invite(Long eventId, Long inviterId, List<Long> userIds) {
        Event event = require(eventId);
        boolean host = event.getHost().getId().equals(inviterId);
        boolean attending = attendeeRepository.findByEventIdAndUserId(eventId, inviterId)
                .map(a -> a.getStatus() != EventAttendee.Status.NOT_GOING).orElse(false);
        if (!host && !attending) throw ApiException.forbidden("Reply to the event before inviting people");

        User inviter = userService.require(inviterId);
        Set<Long> friends = new HashSet<>(friendshipRepository.findFriendIds(inviterId));
        Set<Long> already = new HashSet<>(inviteRepository.findInviteeIds(eventId));

        int sent = 0;
        for (Long id : userIds == null ? List.<Long>of() : userIds) {
            if (!friends.contains(id) || already.contains(id) || id.equals(inviterId)) continue;
            User invitee = userService.require(id);
            inviteRepository.save(EventInvite.builder().event(event).inviter(inviter).invitee(invitee).build());
            notificationService.raise(invitee, inviter, Notification.Type.EVENT_INVITE,
                    inviter.getFullName() + " invited you to " + event.getName() + ".",
                    "/events/" + eventId, event.getCoverUrl());
            already.add(id);
            sent++;
        }
        return sent;
    }

    @Transactional
    public EventDto respond(Long eventId, Long userId, String statusRaw) {
        Event event = require(eventId);
        EventAttendee.Status status = parseStatus(statusRaw);

        EventAttendee row = attendeeRepository.findByEventIdAndUserId(eventId, userId)
                .orElseGet(() -> EventAttendee.builder()
                        .event(event).user(userService.require(userId)).build());
        row.setStatus(status);
        attendeeRepository.save(row);

        if (status == EventAttendee.Status.GOING) {
            notificationService.raise(event.getHost(), userService.require(userId),
                    Notification.Type.EVENT_REMINDER,
                    userService.require(userId).getFullName() + " is going to " + event.getName() + ".",
                    "/events/" + eventId, event.getCoverUrl());
        }

        return decorate(List.of(event), userId).get(0);
    }

    @Transactional
    public void delete(Long eventId, Long userId) {
        Event event = require(eventId);
        if (!event.getHost().getId().equals(userId)) {
            throw ApiException.forbidden("Only the host can cancel an event");
        }
        inviteRepository.deleteByEventId(eventId);
        attendeeRepository.findAttendees(eventId).forEach(attendeeRepository::delete);
        eventRepository.delete(event);
    }

    private Event require(Long eventId) {
        return eventRepository.findById(eventId).orElseThrow(() -> ApiException.notFound("Event"));
    }

    private List<EventDto> decorate(List<Event> events, Long viewerId) {
        if (events.isEmpty()) return List.of();

        List<Long> ids = events.stream().map(Event::getId).toList();

        Map<Long, Long> going = new HashMap<>();
        Map<Long, Long> interested = new HashMap<>();
        for (Object[] row : attendeeRepository.countByEventIdsGrouped(ids)) {
            Long eventId = (Long) row[0];
            EventAttendee.Status status = (EventAttendee.Status) row[1];
            long count = (Long) row[2];
            if (status == EventAttendee.Status.GOING) going.put(eventId, count);
            if (status == EventAttendee.Status.INTERESTED) interested.put(eventId, count);
        }

        Map<Long, String> myStatus = new HashMap<>();
        for (Long id : ids) {
            attendeeRepository.findByEventIdAndUserId(id, viewerId)
                    .ifPresent(a -> myStatus.put(id, a.getStatus().name()));
        }

        return events.stream().map(e -> new EventDto(
                e.getId(),
                e.getName(),
                e.getDescription(),
                e.getCoverUrl(),
                e.getLocation(),
                e.getStartsAt(),
                e.getEndsAt(),
                e.isOnline(),
                UserDto.summary(e.getHost()),
                going.getOrDefault(e.getId(), 0L),
                interested.getOrDefault(e.getId(), 0L),
                myStatus.get(e.getId()),
                inviteRepository.findInviteeIds(e.getId()).size())).toList();
    }

    private static EventAttendee.Status parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return EventAttendee.Status.INTERESTED;
        try {
            return EventAttendee.Status.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return EventAttendee.Status.INTERESTED;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
