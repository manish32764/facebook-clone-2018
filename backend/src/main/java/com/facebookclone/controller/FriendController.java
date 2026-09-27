package com.facebookclone.controller;

import com.facebookclone.dto.FriendDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @GetMapping
    public List<FriendDto> myFriends(@CurrentUser AppUserPrincipal me) {
        return friendService.friendsOf(me.getId(), me.getId());
    }

    @GetMapping("/of/{userId}")
    public List<FriendDto> friendsOf(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return friendService.friendsOf(userId, me.getId());
    }

    @GetMapping("/requests")
    public List<FriendRequestDto> requests(@CurrentUser AppUserPrincipal me) {
        return friendService.incomingRequests(me.getId());
    }

    @GetMapping("/suggestions")
    public List<FriendDto> suggestions(@CurrentUser AppUserPrincipal me,
                                       @RequestParam(defaultValue = "8") int limit) {
        return friendService.suggestions(me.getId(), Math.min(limit, 30));
    }

    @PostMapping("/request/{userId}")
    public FriendDto sendRequest(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return friendService.sendRequest(me.getId(), userId);
    }

    @PostMapping("/requests/{requestId}/accept")
    public FriendDto accept(@PathVariable Long requestId, @CurrentUser AppUserPrincipal me) {
        return friendService.respond(requestId, me.getId(), true);
    }

    @PostMapping("/requests/{requestId}/decline")
    public FriendDto decline(@PathVariable Long requestId, @CurrentUser AppUserPrincipal me) {
        return friendService.respond(requestId, me.getId(), false);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> unfriend(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        friendService.removeFriend(me.getId(), userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/requests/sent")
    public List<SentRequestDto> sentRequests(@CurrentUser AppUserPrincipal me) {
        return friendService.outgoingRequests(me.getId());
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Void> cancelRequest(@PathVariable Long requestId, @CurrentUser AppUserPrincipal me) {
        friendService.cancelRequest(requestId, me.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/mutual/{userId}")
    public MutualFriendsDto mutual(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return friendService.mutualFriends(me.getId(), userId);
    }

    /** Friend ids that count as online, so the contacts rail can show real dots. */
    @GetMapping("/online")
    public Set<Long> online(@CurrentUser AppUserPrincipal me) {
        return friendService.onlineFriendIds(me.getId());
    }
}
