package com.facebookclone.controller;

import com.facebookclone.dto.SocialDtos.FollowStateDto;
import com.facebookclone.dto.UserDto;
import com.facebookclone.service.SocialService;
import com.facebookclone.service.ViewerScopeService;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.FriendService;
import com.facebookclone.service.PresenceService;
import com.facebookclone.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final FriendService friendService;
    private final PresenceService presenceService;
    private final SocialService socialService;
    private final ViewerScopeService scopeService;

    @GetMapping("/me")
    public UserDto me(@CurrentUser AppUserPrincipal me) {
        return userService.profile(me.getId());
    }

    @PatchMapping("/me")
    public UserDto updateMe(@CurrentUser AppUserPrincipal me, @RequestBody Map<String, String> updates) {
        return userService.updateProfile(me.getId(), updates);
    }

    @PostMapping("/me/password")
    public ResponseEntity<Void> changePassword(@CurrentUser AppUserPrincipal me,
                                               @RequestBody Map<String, String> body) {
        userService.changePassword(me.getId(), body.get("currentPassword"), body.get("newPassword"));
        return ResponseEntity.noContent().build();
    }

    /**
     * A profile plus everything the cover needs: your relationship, the pending
     * request id (so it can be answered or cancelled right there), follow state,
     * and which of your friend lists this person is on.
     */
    @GetMapping("/{id}")
    public Map<String, Object> profile(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        scopeService.requireNotBlocked(me.getId(), id);
        FollowStateDto follow = socialService.followState(me.getId(), id);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user", userService.profile(id));
        body.put("relationship", friendService.relationship(me.getId(), id));
        body.put("online", presenceService.isOnline(id));
        body.put("mutualFriends", friendService.mutualFriends(me.getId(), id));
        body.put("friendRequestId", friendService.pendingRequestId(me.getId(), id));
        body.put("following", follow.following());
        body.put("followerCount", follow.followerCount());
        body.put("followingCount", follow.followingCount());
        body.put("friendListIds", socialService.listIdsContaining(me.getId(), id));
        return body;
    }

    @GetMapping("/search")
    public List<UserDto> search(@RequestParam("q") String query, @CurrentUser AppUserPrincipal me) {
        return userService.search(query, me.getId());
    }

    /** Friends with a birthday today, for the right-rail reminder. */
    @GetMapping("/birthdays")
    public List<UserDto> birthdays(@CurrentUser AppUserPrincipal me) {
        return userService.birthdaysToday(me.getId());
    }

    /** Refreshes your presence stamp; the client calls this while the tab is open. */
    @PostMapping("/me/heartbeat")
    public ResponseEntity<Void> heartbeat(@CurrentUser AppUserPrincipal me) {
        presenceService.heartbeat(me.getId());
        return ResponseEntity.noContent().build();
    }
}
