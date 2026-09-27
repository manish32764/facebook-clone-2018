package com.facebookclone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class GroupDtos {

    private GroupDtos() {}

    public record CreateGroupRequest(
            @NotBlank @Size(max = 140) String name,
            @Size(max = 2000) String description,
            String coverUrl,
            String privacy
    ) {}

    /** Every field optional: only the ones sent are changed. */
    public record UpdateGroupRequest(
            @Size(max = 140) String name,
            @Size(max = 2000) String description,
            String coverUrl,
            String privacy,
            Boolean postApproval,
            @Size(max = 4000) String rules
    ) {}

    /** The compact reference a group post carries in its header. */
    public record GroupRefDto(Long id, String name, String coverUrl) {}

    public record GroupDto(
            Long id,
            String name,
            String description,
            String coverUrl,
            String privacy,
            UserDto createdBy,
            long memberCount,
            /** ADMIN, MODERATOR, MEMBER, or null when you have not joined. */
            String myRole,
            boolean joined,
            Instant createdAt,
            boolean postApproval,
            String rules,
            /** You asked to join and nobody has answered yet. */
            boolean requestPending,
            /** Someone invited you. */
            UserDto invitedBy,
            /** Admin and moderator only; zero for everyone else. */
            long pendingRequestCount,
            long pendingPostCount
    ) {}

    public record GroupMemberDto(UserDto user, String role, Instant joinedAt) {}

    public record JoinRequestDto(Long id, UserDto user, String answer, Instant createdAt) {}

    public record JoinRequest(@Size(max = 1000) String answer) {}

    public record InviteRequest(List<Long> userIds) {}

    public record RoleRequest(@NotBlank String role) {}

    public record GroupInviteDto(GroupDto group, UserDto inviter, Instant createdAt) {}
}
