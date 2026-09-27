package com.facebookclone.dto;

import java.time.Instant;
import java.util.List;

public final class FriendDtos {

    private FriendDtos() {}

    /** relationship is one of: NONE, FRIENDS, REQUEST_SENT, REQUEST_RECEIVED, SELF */
    public record FriendDto(UserDto user, String relationship, int mutualFriends) {}

    public record FriendRequestDto(Long requestId, UserDto from, Instant createdAt) {}

    /** A request you sent that has not been answered yet, so you can cancel it. */
    public record SentRequestDto(Long requestId, UserDto to, Instant createdAt) {}

    /** Friends of a profile, plus the mutual ones with the viewer called out. */
    public record MutualFriendsDto(List<UserDto> mutual, int total) {}
}
