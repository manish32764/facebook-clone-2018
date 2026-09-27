package com.facebookclone.service;

import com.facebookclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Who is online, and who is typing where.
 *
 * Presence is persisted (a lastSeenAt stamp the client refreshes) so it survives
 * a restart and works across instances. Typing is deliberately not: it is true
 * for a few seconds at a time, so an in-memory map with a timeout is both
 * cheaper and more accurate than a column.
 */
@Service
@RequiredArgsConstructor
public class PresenceService {

    /** A heartbeat inside this window means online. */
    private static final Duration ONLINE_WINDOW = Duration.ofMinutes(2);

    /** A typing flag older than this has gone stale. */
    private static final Duration TYPING_WINDOW = Duration.ofSeconds(6);

    private final UserRepository userRepository;

    /** conversationId to (userId to the instant they were last seen typing). */
    private final Map<Long, Map<Long, Instant>> typing = new ConcurrentHashMap<>();

    @Transactional
    public void heartbeat(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setLastSeenAt(Instant.now());
            userRepository.save(user);
        });
    }

    @Transactional(readOnly = true)
    public Set<Long> onlineAmong(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return Set.of();
        return new HashSet<>(userRepository.findOnlineIds(userIds, Instant.now().minus(ONLINE_WINDOW)));
    }

    @Transactional(readOnly = true)
    public boolean isOnline(Long userId) {
        return !onlineAmong(List.of(userId)).isEmpty();
    }

    public void setTyping(Long conversationId, Long userId, boolean isTyping) {
        Map<Long, Instant> perThread = typing.computeIfAbsent(conversationId, key -> new ConcurrentHashMap<>());
        if (isTyping) {
            perThread.put(userId, Instant.now());
        } else {
            perThread.remove(userId);
        }
    }

    /** Everyone typing in a thread right now, excluding the person asking. */
    public Set<Long> typingIn(Long conversationId, Long exceptUserId) {
        Map<Long, Instant> perThread = typing.get(conversationId);
        if (perThread == null || perThread.isEmpty()) return Set.of();

        Instant cutoff = Instant.now().minus(TYPING_WINDOW);
        Set<Long> active = new HashSet<>();
        // Copy first: expired entries are dropped as we go.
        for (Map.Entry<Long, Instant> entry : new HashMap<>(perThread).entrySet()) {
            if (entry.getValue().isBefore(cutoff)) {
                perThread.remove(entry.getKey());
            } else if (!entry.getKey().equals(exceptUserId)) {
                active.add(entry.getKey());
            }
        }
        return active;
    }
}
