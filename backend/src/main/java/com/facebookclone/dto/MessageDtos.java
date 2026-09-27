package com.facebookclone.dto;

import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class MessageDtos {

    private MessageDtos() {}

    public record SendMessageRequest(
            @Size(max = 4000) String content,
            String attachmentUrl,
            /** TEXT, IMAGE or STICKER; blank means TEXT. */
            String type
    ) {}

    public record CreateConversationRequest(
            /** One id for a direct thread, several for a group thread. */
            List<Long> participantIds,
            @Size(max = 120) String name
    ) {}

    public record MessageDto(
            Long id,
            Long conversationId,
            UserDto sender,
            String content,
            String attachmentUrl,
            String type,
            boolean deleted,
            Instant createdAt,
            /** Emoji to the people who chose it. */
            Map<String, List<String>> reactions,
            String myReaction
    ) {}

    /** One row in the Messenger list and the header of an open thread. */
    public record ConversationDto(
            Long id,
            String type,
            /** Group name, or the other person's name for a direct thread. */
            String title,
            String pictureUrl,
            List<UserDto> participants,
            /** The person on the other side of a direct thread. */
            UserDto otherUser,
            MessageDto lastMessage,
            long unreadCount,
            Instant lastMessageAt,
            boolean muted,
            /** True when the other side of a direct thread is online. */
            boolean online
    ) {}

    public record ThreadDto(ConversationDto conversation, List<MessageDto> messages, boolean hasMore) {}

    public record TypingRequest(boolean typing) {}

    public record TypingStateDto(List<UserDto> typing) {}

    public record UnreadCountsDto(long messages, long notifications, long friendRequests) {}
}
