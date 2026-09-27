package com.facebookclone.controller;

import com.facebookclone.dto.SocialDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.SafetyService;
import com.facebookclone.service.SocialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Blocking, reporting, following, friend lists and pokes. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SocialController {

    private final SafetyService safetyService;
    private final SocialService socialService;

    // ---------------------------------------------------------------- blocking ---

    @GetMapping("/blocks")
    public List<BlockedDto> blocked(@CurrentUser AppUserPrincipal me) {
        return safetyService.blocked(me.getId());
    }

    @PostMapping("/blocks/{userId}")
    public ResponseEntity<Void> block(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        safetyService.block(me.getId(), userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/blocks/{userId}")
    public ResponseEntity<Void> unblock(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        safetyService.unblock(me.getId(), userId);
        return ResponseEntity.noContent().build();
    }

    // --------------------------------------------------------------- reporting ---

    @PostMapping("/reports")
    public ResponseEntity<ReportDto> report(@CurrentUser AppUserPrincipal me, @Valid @RequestBody ReportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(safetyService.report(me.getId(), request));
    }

    @GetMapping("/reports/mine")
    public List<ReportDto> myReports(@CurrentUser AppUserPrincipal me) {
        return safetyService.myReports(me.getId());
    }

    // --------------------------------------------------------------- following ---

    @PostMapping("/follows/{userId}")
    public FollowStateDto toggleFollow(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return socialService.toggleFollow(me.getId(), userId);
    }

    @GetMapping("/follows/{userId}/followers")
    public List<UserDto> followers(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return socialService.followers(userId, me.getId());
    }

    @GetMapping("/follows/{userId}/following")
    public List<UserDto> following(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return socialService.following(userId, me.getId());
    }

    @GetMapping("/follows/suggestions")
    public List<UserDto> followSuggestions(@CurrentUser AppUserPrincipal me) {
        return socialService.suggestedToFollow(me.getId(), 8);
    }

    // ------------------------------------------------------------ friend lists ---

    @GetMapping("/friend-lists")
    public List<FriendListDto> lists(@CurrentUser AppUserPrincipal me) {
        return socialService.lists(me.getId());
    }

    @PostMapping("/friend-lists")
    public ResponseEntity<FriendListDto> createList(@CurrentUser AppUserPrincipal me,
                                                    @Valid @RequestBody FriendListRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(socialService.createList(me.getId(), request.name()));
    }

    @PatchMapping("/friend-lists/{listId}")
    public FriendListDto renameList(@PathVariable Long listId, @CurrentUser AppUserPrincipal me,
                                    @Valid @RequestBody FriendListRequest request) {
        return socialService.renameList(me.getId(), listId, request.name());
    }

    @DeleteMapping("/friend-lists/{listId}")
    public ResponseEntity<Void> deleteList(@PathVariable Long listId, @CurrentUser AppUserPrincipal me) {
        socialService.deleteList(me.getId(), listId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/friend-lists/{listId}/members/{userId}")
    public FriendListDto addMember(@PathVariable Long listId, @PathVariable Long userId,
                                   @CurrentUser AppUserPrincipal me) {
        return socialService.setMember(me.getId(), listId, userId, true);
    }

    @DeleteMapping("/friend-lists/{listId}/members/{userId}")
    public FriendListDto removeMember(@PathVariable Long listId, @PathVariable Long userId,
                                      @CurrentUser AppUserPrincipal me) {
        return socialService.setMember(me.getId(), listId, userId, false);
    }

    // ------------------------------------------------------------------ pokes ---

    @GetMapping("/pokes")
    public List<PokeDto> pokes(@CurrentUser AppUserPrincipal me) {
        return socialService.pendingPokes(me.getId());
    }

    @GetMapping("/pokes/sent")
    public List<PokeDto> sentPokes(@CurrentUser AppUserPrincipal me) {
        return socialService.sentPokes(me.getId());
    }

    @PostMapping("/pokes/{userId}")
    public PokeDto poke(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return socialService.poke(me.getId(), userId);
    }

    @DeleteMapping("/pokes/{pokeId}")
    public ResponseEntity<Void> dismiss(@PathVariable Long pokeId, @CurrentUser AppUserPrincipal me) {
        socialService.dismissPoke(me.getId(), pokeId);
        return ResponseEntity.noContent().build();
    }
}
