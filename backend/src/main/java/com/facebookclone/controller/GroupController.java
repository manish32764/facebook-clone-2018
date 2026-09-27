package com.facebookclone.controller;

import com.facebookclone.dto.GroupDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @GetMapping
    public List<GroupDto> joined(@CurrentUser AppUserPrincipal me) {
        return groupService.joined(me.getId());
    }

    @GetMapping("/discover")
    public List<GroupDto> discover(@CurrentUser AppUserPrincipal me) {
        return groupService.discover(me.getId());
    }

    @GetMapping("/invites")
    public List<GroupInviteDto> invites(@CurrentUser AppUserPrincipal me) {
        return groupService.myInvites(me.getId());
    }

    @GetMapping("/{id}")
    public GroupDto one(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return groupService.one(id, me.getId());
    }

    @GetMapping("/{id}/members")
    public List<GroupMemberDto> members(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return groupService.members(id, me.getId());
    }

    @PostMapping
    public ResponseEntity<GroupDto> create(@CurrentUser AppUserPrincipal me,
                                           @Valid @RequestBody CreateGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.create(me.getId(), request));
    }

    @PatchMapping("/{id}")
    public GroupDto update(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                           @Valid @RequestBody UpdateGroupRequest request) {
        return groupService.update(id, me.getId(), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        groupService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    /** Joins a public group, or asks to join a private one. */
    @PostMapping("/{id}/join")
    public GroupDto join(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                         @RequestBody(required = false) JoinRequest request) {
        return groupService.join(id, me.getId(), request == null ? null : request.answer());
    }

    @DeleteMapping("/{id}/request")
    public ResponseEntity<Void> cancelRequest(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        groupService.cancelRequest(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/requests")
    public List<JoinRequestDto> requests(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return groupService.requests(id, me.getId());
    }

    @PostMapping("/{id}/requests/{userId}/approve")
    public ResponseEntity<Void> approve(@PathVariable Long id, @PathVariable Long userId,
                                        @CurrentUser AppUserPrincipal me) {
        groupService.answerRequest(id, userId, me.getId(), true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/requests/{userId}/decline")
    public ResponseEntity<Void> decline(@PathVariable Long id, @PathVariable Long userId,
                                        @CurrentUser AppUserPrincipal me) {
        groupService.answerRequest(id, userId, me.getId(), false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invite")
    public Map<String, Integer> invite(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                       @RequestBody InviteRequest request) {
        return Map.of("sent", groupService.invite(id, me.getId(), request.userIds()));
    }

    @DeleteMapping("/{id}/invite")
    public ResponseEntity<Void> declineInvite(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        groupService.declineInvite(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/membership")
    public ResponseEntity<Void> leave(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        groupService.leave(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/members/{userId}")
    public GroupMemberDto setRole(@PathVariable Long id, @PathVariable Long userId,
                                  @CurrentUser AppUserPrincipal me, @Valid @RequestBody RoleRequest request) {
        return groupService.setRole(id, userId, me.getId(), request.role());
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id, @PathVariable Long userId,
                                             @CurrentUser AppUserPrincipal me) {
        groupService.removeMember(id, userId, me.getId());
        return ResponseEntity.noContent().build();
    }
}
