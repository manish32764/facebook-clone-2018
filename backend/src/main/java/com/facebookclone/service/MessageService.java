package com.facebookclone.service;

import com.facebookclone.dto.MessageDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Messenger. Threads are either DIRECT (exactly two people, looked up by the
 * pair so opening a chat twice reuses the same thread) or GROUP.
 *
 * Read state lives on the participant row as a lastReadAt watermark rather than
 * a flag per message, which keeps "mark this thread read" a single write.
 */
@Service
@RequiredArgsConstructor
public class MessageService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final MessageReactionRepository reactionRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final NotificationService notificationService;
    private final PresenceService presenceService;
    private final ViewerScopeService scopeService;

    // ------------------------------------------------------------------ reads ---

    /** The Messenger list: every thread you are in, newest activity first. */
    @Transactional(readOnly = true)
    public List<ConversationDto> conversations(Long userId) {
        List<Conversation> threads = conversationRepository.findForUser(userId);
        if (threads.isEmpty()) return List.of();

        List<Long> ids = threads.stream().map(Conversation::getId).toList();

        Map<Long, List<ConversationParticipant>> byThread = participantRepository.findByConversationIds(ids)
                .stream().collect(Collectors.groupingBy(p -> p.getConversation().getId()));

        Map<Long, Message> latest = messageRepository.findLatestPerConversation(ids).stream()
                .collect(Collectors.toMap(m -> m.getConversation().getId(), m -> m, (a, b) -> a));

        Set<Long> onlineIds = presenceService.onlineAmong(byThread.values().stream()
                .flatMap(List::stream)
                .map(p -> p.getUser().getId())
                .filter(id -> !id.equals(userId))
                .collect(Collectors.toSet()));

        return threads.stream()
                .map(thread -> toConversationDto(thread, byThread.getOrDefault(thread.getId(), List.of()),
                        latest.get(thread.getId()), userId, onlineIds))
                .toList();
    }

    @Transactional(readOnly = true)
    public ThreadDto thread(Long conversationId, Long userId, int page, int size) {
        Conversation thread = requireMembership(conversationId, userId);

        Page<Message> found = messageRepository.findThread(conversationId, PageRequest.of(page, size));
        List<Message> newestFirst = found.getContent();

        // The API returns oldest-first so the client can append without reversing.
        List<Message> ordered = new ArrayList<>(newestFirst);
        Collections.reverse(ordered);

        List<ConversationParticipant> participants = participantRepository
                .findByConversationIds(List.of(conversationId));
        Set<Long> onlineIds = presenceService.onlineAmong(participants.stream()
                .map(p -> p.getUser().getId()).filter(id -> !id.equals(userId)).toList());

        Message last = newestFirst.isEmpty() ? null : newestFirst.get(0);
        ConversationDto header = toConversationDto(thread, participants, last, userId, onlineIds);

        return new ThreadDto(header, toMessageDtos(ordered, userId), found.hasNext());
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return messageRepository.countUnreadForUser(userId);
    }

    @Transactional(readOnly = true)
    public List<MessageDto> search(String query, Long userId, int limit) {
        if (query == null || query.trim().length() < 2) return List.of();
        return toMessageDtos(messageRepository.search(query.trim(), userId, PageRequest.of(0, limit)), userId);
    }

    // ----------------------------------------------------------------- writes ---

    /**
     * Opens the direct thread with someone, creating it on first use. Returning
     * the existing thread rather than a new one is what makes "Message" from a
     * profile land in the conversation you already had.
     */
    @Transactional
    public ConversationDto openDirect(Long userId, Long otherUserId) {
        if (Objects.equals(userId, otherUserId)) {
            throw ApiException.badRequest("You cannot message yourself");
        }
        scopeService.requireNotBlocked(userId, otherUserId);
        User me = userService.require(userId);
        User other = userService.require(otherUserId);

        Conversation thread = conversationRepository.findDirectBetween(userId, otherUserId)
                .orElseGet(() -> {
                    Conversation created = conversationRepository.save(Conversation.builder()
                            .type(Conversation.Type.DIRECT)
                            .createdBy(me)
                            .build());
                    join(created, me);
                    join(created, other);
                    return created;
                });

        return describe(thread, userId);
    }

    /** A named group thread. Two participants plus you is the smallest sensible group. */
    @Transactional
    public ConversationDto createGroup(Long userId, CreateConversationRequest req) {
        List<Long> others = req.participantIds() == null ? List.of() : req.participantIds().stream()
                .filter(id -> !id.equals(userId)).distinct().toList();

        if (others.isEmpty()) {
            throw ApiException.badRequest("Pick at least one person to add");
        }
        if (others.size() == 1 && (req.name() == null || req.name().isBlank())) {
            return openDirect(userId, others.get(0));
        }

        User me = userService.require(userId);
        Conversation thread = conversationRepository.save(Conversation.builder()
                .type(Conversation.Type.GROUP)
                .name(req.name() == null || req.name().isBlank() ? null : req.name().trim())
                .createdBy(me)
                .build());

        join(thread, me);
        for (User participant : userRepository.findAllById(others)) {
            join(thread, participant);
        }

        system(thread, me, me.getFullName() + " started this conversation.");
        return describe(thread, userId);
    }

    @Transactional
    public MessageDto send(Long conversationId, Long senderId, SendMessageRequest req) {
        Conversation thread = requireMembership(conversationId, senderId);
        if (thread.getType() == Conversation.Type.DIRECT) {
            for (ConversationParticipant p : participantRepository.findByConversationIds(List.of(conversationId))) {
                if (!p.getUser().getId().equals(senderId) && scopeService.blockedEitherWay(senderId, p.getUser().getId())) {
                    throw ApiException.forbidden("You can't message this person");
                }
            }
        }

        String content = req.content() == null ? "" : req.content().trim();
        Message.Type type = parseType(req.type());
        boolean hasAttachment = req.attachmentUrl() != null && !req.attachmentUrl().isBlank();

        if (content.isEmpty() && !hasAttachment && type != Message.Type.STICKER) {
            throw ApiException.badRequest("A message needs text, an image or a sticker");
        }

        User sender = userService.require(senderId);
        Message message = messageRepository.save(Message.builder()
                .conversation(thread)
                .sender(sender)
                .content(content)
                .attachmentUrl(hasAttachment ? req.attachmentUrl().trim() : null)
                .type(type)
                .build());

        thread.setLastMessageAt(message.getCreatedAt());
        conversationRepository.save(thread);

        // Sending is also reading, and it clears your own typing flag.
        markRead(conversationId, senderId);
        presenceService.setTyping(conversationId, senderId, false);

        notifyRecipients(thread, sender, message);
        return toMessageDto(message, senderId, Map.of());
    }

    /** Stamps the read watermark on your participant row. */
    @Transactional
    public void markRead(Long conversationId, Long userId) {
        participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .ifPresent(participant -> {
                    participant.setLastReadAt(Instant.now());
                    participantRepository.save(participant);
                });
    }


    @Transactional
    public MessageDto react(Long messageId, Long userId, String emoji) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> ApiException.notFound("Message"));
        requireMembership(message.getConversation().getId(), userId);

        Optional<MessageReaction> existing = reactionRepository.findByMessageIdAndUserId(messageId, userId);
        if (existing.isPresent()) {
            MessageReaction row = existing.get();
            if (emoji == null || emoji.isBlank() || row.getEmoji().equals(emoji)) {
                reactionRepository.delete(row);
            } else {
                row.setEmoji(emoji);
                reactionRepository.save(row);
            }
        } else if (emoji != null && !emoji.isBlank()) {
            reactionRepository.save(MessageReaction.builder()
                    .message(message).user(userService.require(userId)).emoji(emoji.trim()).build());
        }

        return toMessageDtos(List.of(message), userId).get(0);
    }

    /** A withdrawn message keeps its row so the thread order stays stable. */
    @Transactional
    public void unsend(Long messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> ApiException.notFound("Message"));
        if (!message.getSender().getId().equals(userId)) {
            throw ApiException.forbidden("You can only remove your own messages");
        }
        message.setDeleted(true);
        message.setContent(null);
        message.setAttachmentUrl(null);
        messageRepository.save(message);
    }

    @Transactional
    public void setMuted(Long conversationId, Long userId, boolean muted) {
        participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .ifPresent(participant -> {
                    participant.setMuted(muted);
                    participantRepository.save(participant);
                });
    }

    @Transactional
    public void leave(Long conversationId, Long userId) {
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> ApiException.notFound("Conversation"));

        Conversation thread = participant.getConversation();
        if (thread.getType() == Conversation.Type.GROUP) {
            system(thread, participant.getUser(),
                    participant.getUser().getFullName() + " left the conversation.");
            participantRepository.delete(participant);
        } else {
            // A direct thread is archived rather than destroyed - the other side keeps it.
            participant.setArchived(true);
            participantRepository.save(participant);
        }
    }

    public void setTyping(Long conversationId, Long userId, boolean typing) {
        presenceService.setTyping(conversationId, userId, typing);
    }

    @Transactional(readOnly = true)
    public TypingStateDto typingState(Long conversationId, Long userId) {
        requireMembership(conversationId, userId);
        Set<Long> ids = presenceService.typingIn(conversationId, userId);
        if (ids.isEmpty()) return new TypingStateDto(List.of());
        return new TypingStateDto(userRepository.findAllById(ids).stream().map(UserDto::summary).toList());
    }


    // -------------------------------------------------------------- internals ---

    private void join(Conversation thread, User user) {
        if (participantRepository.existsByConversationIdAndUserId(thread.getId(), user.getId())) return;
        participantRepository.save(ConversationParticipant.builder()
                .conversation(thread).user(user).build());
    }

    private void system(Conversation thread, User actor, String text) {
        Message message = messageRepository.save(Message.builder()
                .conversation(thread).sender(actor).content(text).type(Message.Type.SYSTEM).build());
        thread.setLastMessageAt(message.getCreatedAt());
        conversationRepository.save(thread);
    }

    /** Membership is the only authorisation a thread needs. */
    private Conversation requireMembership(Long conversationId, Long userId) {
        Conversation thread = conversationRepository.findById(conversationId)
                .orElseThrow(() -> ApiException.notFound("Conversation"));
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw ApiException.forbidden("You are not part of that conversation");
        }
        return thread;
    }

    private ConversationDto describe(Conversation thread, Long viewerId) {
        List<ConversationParticipant> participants = participantRepository
                .findByConversationIds(List.of(thread.getId()));
        Message last = messageRepository.findLatestPerConversation(List.of(thread.getId()))
                .stream().findFirst().orElse(null);
        Set<Long> onlineIds = presenceService.onlineAmong(participants.stream()
                .map(p -> p.getUser().getId()).filter(id -> !id.equals(viewerId)).toList());
        return toConversationDto(thread, participants, last, viewerId, onlineIds);
    }

    private ConversationDto toConversationDto(Conversation thread,
                                              List<ConversationParticipant> participants,
                                              Message last,
                                              Long viewerId,
                                              Set<Long> onlineIds) {
        User other = participants.stream()
                .map(ConversationParticipant::getUser)
                .filter(u -> !u.getId().equals(viewerId))
                .findFirst()
                .orElse(null);

        ConversationParticipant mine = participants.stream()
                .filter(p -> p.getUser().getId().equals(viewerId))
                .findFirst()
                .orElse(null);

        Instant since = mine == null ? null : mine.getLastReadAt();
        long unread = messageRepository.countUnread(thread.getId(), viewerId,
                // Postgres cannot type a null timestamp parameter, so never-read means since the epoch.
                since == null ? Instant.EPOCH : since);

        String title = thread.getType() == Conversation.Type.GROUP
                ? (thread.getName() != null ? thread.getName() : groupTitle(participants, viewerId))
                : (other != null ? other.getFullName() : "Conversation");

        String picture = thread.getType() == Conversation.Type.GROUP
                ? thread.getPictureUrl()
                : (other == null ? null : other.getAvatarUrl());

        return new ConversationDto(
                thread.getId(),
                thread.getType().name(),
                title,
                picture,
                participants.stream().map(p -> UserDto.summary(p.getUser())).toList(),
                other == null ? null : UserDto.summary(other),
                last == null ? null : toMessageDto(last, viewerId, Map.of()),
                unread,
                thread.getLastMessageAt(),
                mine != null && mine.isMuted(),
                other != null && onlineIds.contains(other.getId()));
    }

    /** An unnamed group thread is titled after the people in it. */
    private static String groupTitle(List<ConversationParticipant> participants, Long viewerId) {
        List<String> names = participants.stream()
                .map(ConversationParticipant::getUser)
                .filter(u -> !u.getId().equals(viewerId))
                .map(User::getFirstName)
                .toList();
        if (names.isEmpty()) return "Conversation";
        if (names.size() <= 3) return String.join(", ", names);
        return String.join(", ", names.subList(0, 2)) + " and " + (names.size() - 2) + " others";
    }


    private List<MessageDto> toMessageDtos(List<Message> messages, Long viewerId) {
        if (messages.isEmpty()) return List.of();

        Map<Long, List<MessageReaction>> byMessage = reactionRepository
                .findByMessageIds(messages.stream().map(Message::getId).toList())
                .stream().collect(Collectors.groupingBy(r -> r.getMessage().getId()));

        return messages.stream()
                .map(m -> toMessageDto(m, viewerId, byMessage.getOrDefault(m.getId(), List.of()).stream()
                        .collect(Collectors.groupingBy(MessageReaction::getEmoji))))
                .toList();
    }

    private static MessageDto toMessageDto(Message m, Long viewerId,
                                           Map<String, List<MessageReaction>> reactionsByEmoji) {
        Map<String, List<String>> reactions = new LinkedHashMap<>();
        String mine = null;
        for (Map.Entry<String, List<MessageReaction>> entry : reactionsByEmoji.entrySet()) {
            reactions.put(entry.getKey(), entry.getValue().stream()
                    .map(r -> r.getUser().getFullName()).toList());
            if (entry.getValue().stream().anyMatch(r -> r.getUser().getId().equals(viewerId))) {
                mine = entry.getKey();
            }
        }

        return new MessageDto(
                m.getId(),
                m.getConversation().getId(),
                UserDto.summary(m.getSender()),
                m.isDeleted() ? null : m.getContent(),
                m.isDeleted() ? null : m.getAttachmentUrl(),
                m.getType().name(),
                m.isDeleted(),
                m.getCreatedAt(),
                reactions,
                mine);
    }

    /** One notification per recipient per message, skipping muted threads. */
    private void notifyRecipients(Conversation thread, User sender, Message message) {
        String preview = message.getContent() == null || message.getContent().isBlank()
                ? "sent you an attachment"
                : abbreviate(message.getContent(), 80);

        for (ConversationParticipant participant : participantRepository
                .findByConversationIds(List.of(thread.getId()))) {
            if (participant.getUser().getId().equals(sender.getId()) || participant.isMuted()) continue;

            notificationService.raise(participant.getUser(), sender, Notification.Type.MESSAGE,
                    sender.getFullName() + ": " + preview,
                    "/messages/" + thread.getId(), null);
        }
    }

    private static String abbreviate(String text, int max) {
        String trimmed = text.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max - 1) + "\u2026";
    }

    private static Message.Type parseType(String raw) {
        if (raw == null || raw.isBlank()) return Message.Type.TEXT;
        try {
            Message.Type parsed = Message.Type.valueOf(raw.trim().toUpperCase());
            // SYSTEM messages are written by the server, never posted by a client.
            return parsed == Message.Type.SYSTEM ? Message.Type.TEXT : parsed;
        } catch (IllegalArgumentException ex) {
            return Message.Type.TEXT;
        }
    }

}
