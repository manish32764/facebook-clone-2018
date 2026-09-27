package com.facebookclone.service;

import com.facebookclone.dto.GroupDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Groups: membership, join requests for private groups, invites, roles,
 * settings and deletion. Posting and post approval live in {@link PostService}.
 */
@Service
@RequiredArgsConstructor
public class GroupService {

    private final SocialGroupRepository groupRepository;
    private final GroupMemberRepository memberRepository;
    private final GroupJoinRequestRepository requestRepository;
    private final GroupInviteRepository inviteRepository;
    private final PostRepository postRepository;
    private final FriendshipRepository friendshipRepository;
    private final PostService postService;
    private final UserService userService;
    private final ViewerScopeService scopeService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<GroupDto> joined(Long userId) {
        return decorate(groupRepository.findJoined(userId), userId);
    }

    /** Groups you have not joined. Private ones show too; joining them means asking. */
    @Transactional(readOnly = true)
    public List<GroupDto> discover(Long userId) {
        Set<Long> mine = new HashSet<>(memberRepository.findGroupIds(userId));
        return decorate(groupRepository.findAll().stream()
                .filter(g -> !mine.contains(g.getId()))
                .sorted(Comparator.comparing(SocialGroup::getCreatedAt).reversed())
                .toList(), userId);
    }

    /** Anyone can open a group's page; a private group hides its posts and members from outsiders. */
    @Transactional(readOnly = true)
    public GroupDto one(Long groupId, Long userId) {
        return decorate(List.of(require(groupId)), userId).get(0);
    }

    @Transactional(readOnly = true)
    public List<GroupMemberDto> members(Long groupId, Long userId) {
        requireReadable(groupId, userId);
        Set<Long> hidden = scopeService.hiddenIds(userId);
        return memberRepository.findMembers(groupId).stream()
                .filter(m -> !hidden.contains(m.getUser().getId()))
                .map(m -> new GroupMemberDto(UserDto.summary(m.getUser()), m.getRole().name(), m.getJoinedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupDto> search(String query, Long userId) {
        if (query == null || query.trim().length() < 2) return List.of();
        return decorate(groupRepository.search(query.trim()), userId);
    }

    /** The creator becomes the first admin, as they do in the real product. */
    @Transactional
    public GroupDto create(Long userId, CreateGroupRequest req) {
        User creator = userService.require(userId);
        SocialGroup group = groupRepository.save(SocialGroup.builder()
                .name(req.name().trim())
                .description(req.description() == null ? null : req.description().trim())
                .coverUrl(blankToNull(req.coverUrl()))
                .privacy(parsePrivacy(req.privacy()))
                .createdBy(creator)
                .build());

        memberRepository.save(GroupMember.builder()
                .group(group).user(creator).role(GroupMember.Role.ADMIN).build());

        return decorate(List.of(group), userId).get(0);
    }

    @Transactional
    public GroupDto update(Long groupId, Long userId, UpdateGroupRequest req) {
        SocialGroup group = require(groupId);
        requireRole(groupId, userId, GroupMember.Role.ADMIN);

        if (req.name() != null && !req.name().isBlank()) group.setName(req.name().trim());
        if (req.description() != null) group.setDescription(blankToNull(req.description()));
        if (req.coverUrl() != null) group.setCoverUrl(blankToNull(req.coverUrl()));
        if (req.privacy() != null) group.setPrivacy(parsePrivacy(req.privacy()));
        if (req.postApproval() != null) group.setPostApproval(req.postApproval());
        if (req.rules() != null) group.setRules(blankToNull(req.rules()));

        return decorate(List.of(groupRepository.save(group)), userId).get(0);
    }

    /** Deletes the group and everything in it. Admins only. */
    @Transactional
    public void delete(Long groupId, Long userId) {
        SocialGroup group = require(groupId);
        requireRole(groupId, userId, GroupMember.Role.ADMIN);

        postRepository.findAllInGroup(groupId).forEach(postService::purge);
        requestRepository.deleteByGroupId(groupId);
        inviteRepository.deleteByGroupId(groupId);
        memberRepository.deleteByGroupId(groupId);
        groupRepository.delete(group);
    }

    /**
     * Joins a public group straight away. A private group needs an admin's
     * approval, unless someone already invited you.
     */
    @Transactional
    public GroupDto join(Long groupId, Long userId, String answer) {
        SocialGroup group = require(groupId);
        if (memberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            return decorate(List.of(group), userId).get(0);
        }
        User user = userService.require(userId);

        Optional<GroupInvite> invite = inviteRepository.findByGroupIdAndInviteeId(groupId, userId);
        if (group.getPrivacy() == SocialGroup.Privacy.PRIVATE && invite.isEmpty()) {
            if (!requestRepository.existsByGroupIdAndUserId(groupId, userId)) {
                requestRepository.save(GroupJoinRequest.builder()
                        .group(group).user(user).answer(blankToNull(answer)).build());
                notifyModerators(group, user, user.getFullName() + " asked to join " + group.getName() + ".",
                        Notification.Type.GROUP_JOIN_REQUEST);
            }
            return decorate(List.of(group), userId).get(0);
        }

        addMember(group, user);
        invite.ifPresent(inviteRepository::delete);
        notifyModerators(group, user, user.getFullName() + " joined " + group.getName() + ".",
                Notification.Type.GROUP_INVITE);
        return decorate(List.of(group), userId).get(0);
    }

    @Transactional
    public void cancelRequest(Long groupId, Long userId) {
        requestRepository.findByGroupIdAndUserId(groupId, userId).ifPresent(requestRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<JoinRequestDto> requests(Long groupId, Long userId) {
        requireModerator(groupId, userId);
        return requestRepository.findForGroup(groupId).stream()
                .map(r -> new JoinRequestDto(r.getId(), UserDto.summary(r.getUser()), r.getAnswer(), r.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void answerRequest(Long groupId, Long requesterId, Long moderatorId, boolean approve) {
        SocialGroup group = require(groupId);
        requireModerator(groupId, moderatorId);
        GroupJoinRequest request = requestRepository.findByGroupIdAndUserId(groupId, requesterId)
                .orElseThrow(() -> ApiException.notFound("Join request"));

        requestRepository.delete(request);
        if (approve) {
            addMember(group, request.getUser());
            notificationService.raise(request.getUser(), userService.require(moderatorId),
                    Notification.Type.GROUP_JOIN_APPROVED,
                    "Your request to join " + group.getName() + " was approved.",
                    "/groups/" + groupId, group.getCoverUrl());
        }
    }

    /** Members invite friends; an invite to a private group lets them skip approval. */
    @Transactional
    public int invite(Long groupId, Long inviterId, List<Long> userIds) {
        SocialGroup group = require(groupId);
        if (!memberRepository.existsByGroupIdAndUserId(groupId, inviterId)) {
            throw ApiException.forbidden("Join the group before inviting people");
        }
        User inviter = userService.require(inviterId);
        Set<Long> friends = new HashSet<>(friendshipRepository.findFriendIds(inviterId));
        Set<Long> already = new HashSet<>(inviteRepository.findInviteeIds(groupId));

        int sent = 0;
        for (Long id : userIds == null ? List.<Long>of() : userIds) {
            if (!friends.contains(id) || already.contains(id)) continue;
            if (memberRepository.existsByGroupIdAndUserId(groupId, id)) continue;
            User invitee = userService.require(id);
            inviteRepository.save(GroupInvite.builder().group(group).inviter(inviter).invitee(invitee).build());
            notificationService.raise(invitee, inviter, Notification.Type.GROUP_INVITE,
                    inviter.getFullName() + " invited you to join " + group.getName() + ".",
                    "/groups/" + groupId, group.getCoverUrl());
            sent++;
        }
        return sent;
    }

    @Transactional(readOnly = true)
    public List<GroupInviteDto> myInvites(Long userId) {
        return inviteRepository.findForInvitee(userId).stream()
                .map(i -> new GroupInviteDto(decorate(List.of(i.getGroup()), userId).get(0),
                        UserDto.summary(i.getInviter()), i.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void declineInvite(Long groupId, Long userId) {
        inviteRepository.findByGroupIdAndInviteeId(groupId, userId).ifPresent(inviteRepository::delete);
    }

    @Transactional
    public void leave(Long groupId, Long userId) {
        GroupMember membership = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> ApiException.notFound("Membership"));

        if (membership.getRole() == GroupMember.Role.ADMIN && adminCount(groupId) == 1) {
            throw ApiException.badRequest("Make someone else an admin before you leave");
        }
        memberRepository.delete(membership);
    }

    /** Promote or demote a member. Admins only, and the last admin cannot step down. */
    @Transactional
    public GroupMemberDto setRole(Long groupId, Long targetId, Long adminId, String roleRaw) {
        SocialGroup group = require(groupId);
        requireRole(groupId, adminId, GroupMember.Role.ADMIN);
        GroupMember target = memberRepository.findByGroupIdAndUserId(groupId, targetId)
                .orElseThrow(() -> ApiException.notFound("Member"));

        GroupMember.Role role;
        try {
            role = GroupMember.Role.valueOf(roleRaw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Role must be ADMIN, MODERATOR or MEMBER");
        }
        if (target.getRole() == GroupMember.Role.ADMIN && role != GroupMember.Role.ADMIN && adminCount(groupId) == 1) {
            throw ApiException.badRequest("A group needs at least one admin");
        }
        target.setRole(role);
        memberRepository.save(target);

        if (!targetId.equals(adminId) && role != GroupMember.Role.MEMBER) {
            notificationService.raise(target.getUser(), userService.require(adminId), Notification.Type.GROUP_ROLE,
                    "You are now " + (role == GroupMember.Role.ADMIN ? "an admin" : "a moderator")
                            + " of " + group.getName() + ".",
                    "/groups/" + groupId, group.getCoverUrl());
        }
        return new GroupMemberDto(UserDto.summary(target.getUser()), role.name(), target.getJoinedAt());
    }

    /** Admins remove anyone; moderators remove ordinary members. */
    @Transactional
    public void removeMember(Long groupId, Long targetId, Long moderatorId) {
        GroupMember actor = memberRepository.findByGroupIdAndUserId(groupId, moderatorId)
                .orElseThrow(() -> ApiException.forbidden("You are not in this group"));
        GroupMember target = memberRepository.findByGroupIdAndUserId(groupId, targetId)
                .orElseThrow(() -> ApiException.notFound("Member"));

        boolean allowed = actor.getRole() == GroupMember.Role.ADMIN
                || (actor.getRole() == GroupMember.Role.MODERATOR && target.getRole() == GroupMember.Role.MEMBER);
        if (!allowed || targetId.equals(moderatorId)) {
            throw ApiException.forbidden("You cannot remove this member");
        }
        memberRepository.delete(target);
    }

    @Transactional(readOnly = true)
    public SocialGroup require(Long groupId) {
        return groupRepository.findById(groupId).orElseThrow(() -> ApiException.notFound("Group"));
    }

    @Transactional(readOnly = true)
    public boolean isMember(Long groupId, Long userId) {
        return memberRepository.existsByGroupIdAndUserId(groupId, userId);
    }

    private void addMember(SocialGroup group, User user) {
        memberRepository.save(GroupMember.builder().group(group).user(user).role(GroupMember.Role.MEMBER).build());
    }

    private long adminCount(Long groupId) {
        return memberRepository.findMembers(groupId).stream()
                .filter(m -> m.getRole() == GroupMember.Role.ADMIN).count();
    }

    private void requireReadable(Long groupId, Long userId) {
        SocialGroup group = require(groupId);
        if (group.getPrivacy() == SocialGroup.Privacy.PRIVATE && !isMember(groupId, userId)) {
            throw ApiException.forbidden("That group is private");
        }
    }

    private void requireModerator(Long groupId, Long userId) {
        GroupMember.Role role = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .map(GroupMember::getRole).orElse(null);
        if (role == null || role == GroupMember.Role.MEMBER) {
            throw ApiException.forbidden("Only group admins and moderators can do that");
        }
    }

    private void requireRole(Long groupId, Long userId, GroupMember.Role wanted) {
        GroupMember.Role role = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .map(GroupMember::getRole).orElse(null);
        if (role != wanted) throw ApiException.forbidden("Only group admins can do that");
    }

    private void notifyModerators(SocialGroup group, User actor, String text, Notification.Type type) {
        for (GroupMember member : memberRepository.findMembers(group.getId())) {
            if (member.getRole() == GroupMember.Role.MEMBER) continue;
            notificationService.raise(member.getUser(), actor, type, text,
                    "/groups/" + group.getId(), group.getCoverUrl());
        }
    }

    private List<GroupDto> decorate(List<SocialGroup> groups, Long userId) {
        if (groups.isEmpty()) return List.of();

        List<Long> ids = groups.stream().map(SocialGroup::getId).toList();
        Map<Long, Long> counts = memberRepository.countByGroupIds(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        Map<Long, GroupMember.Role> myRoles = new HashMap<>();
        for (Object[] row : memberRepository.findRoles(userId, ids)) {
            myRoles.put((Long) row[0], (GroupMember.Role) row[1]);
        }

        return groups.stream().map(g -> {
            GroupMember.Role role = myRoles.get(g.getId());
            boolean moderator = role != null && role != GroupMember.Role.MEMBER;
            UserDto invitedBy = role != null ? null : inviteRepository.findByGroupIdAndInviteeId(g.getId(), userId)
                    .map(i -> UserDto.summary(i.getInviter())).orElse(null);
            return new GroupDto(
                    g.getId(),
                    g.getName(),
                    g.getDescription(),
                    g.getCoverUrl(),
                    g.getPrivacy().name(),
                    UserDto.summary(g.getCreatedBy()),
                    counts.getOrDefault(g.getId(), 0L),
                    role == null ? null : role.name(),
                    role != null,
                    g.getCreatedAt(),
                    g.isPostApproval(),
                    g.getRules(),
                    role == null && requestRepository.existsByGroupIdAndUserId(g.getId(), userId),
                    invitedBy,
                    moderator ? requestRepository.countByGroupId(g.getId()) : 0,
                    moderator ? postRepository.countByGroupIdAndPendingTrue(g.getId()) : 0);
        }).toList();
    }

    private static SocialGroup.Privacy parsePrivacy(String raw) {
        if (raw == null || raw.isBlank()) return SocialGroup.Privacy.PUBLIC;
        try {
            return SocialGroup.Privacy.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return SocialGroup.Privacy.PUBLIC;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
