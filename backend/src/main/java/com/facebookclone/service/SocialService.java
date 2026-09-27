package com.facebookclone.service;

import com.facebookclone.dto.SocialDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/** Following, friend lists and pokes. */
@Service
@RequiredArgsConstructor
public class SocialService {

    private final FollowRepository followRepository;
    private final FriendListRepository friendListRepository;
    private final PokeRepository pokeRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final ViewerScopeService scopeService;
    private final NotificationService notificationService;

    // --------------------------------------------------------------- following ---

    /** Toggles following; returns the fresh state. */
    @Transactional
    public FollowStateDto toggleFollow(Long userId, Long targetId) {
        if (Objects.equals(userId, targetId)) throw ApiException.badRequest("You cannot follow yourself");
        scopeService.requireNotBlocked(userId, targetId);

        Optional<Follow> existing = followRepository.findByFollowerIdAndFolloweeId(userId, targetId);
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
        } else {
            User me = userService.require(userId);
            User target = userService.require(targetId);
            followRepository.save(Follow.builder().follower(me).followee(target).build());
            notificationService.raise(target, me, Notification.Type.FOLLOW,
                    me.getFullName() + " started following you.", "/profile/" + userId, null);
        }
        return followState(userId, targetId);
    }

    @Transactional(readOnly = true)
    public FollowStateDto followState(Long viewerId, Long targetId) {
        return new FollowStateDto(
                followRepository.existsByFollowerIdAndFolloweeId(viewerId, targetId),
                followRepository.countByFolloweeId(targetId),
                followRepository.countByFollowerId(targetId));
    }

    @Transactional(readOnly = true)
    public List<UserDto> followers(Long userId, Long viewerId) {
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        return followRepository.findFollowers(userId).stream()
                .map(Follow::getFollower).filter(u -> !hidden.contains(u.getId()))
                .map(UserDto::summary).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> following(Long userId, Long viewerId) {
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        return followRepository.findFollowing(userId).stream()
                .map(Follow::getFollowee).filter(u -> !hidden.contains(u.getId()))
                .map(UserDto::summary).toList();
    }

    // ------------------------------------------------------------ friend lists ---

    /** Your lists, with Close Friends and Acquaintances created on first use. */
    @Transactional
    public List<FriendListDto> lists(Long ownerId) {
        ensureDefaults(ownerId);
        return friendListRepository.findByOwnerIdOrderByKindAscNameAsc(ownerId).stream()
                .map(SocialService::toDto).toList();
    }

    @Transactional
    public FriendListDto createList(Long ownerId, String name) {
        FriendList list = friendListRepository.save(FriendList.builder()
                .owner(userService.require(ownerId)).name(name.trim()).kind(FriendList.Kind.CUSTOM).build());
        return toDto(list);
    }

    @Transactional
    public FriendListDto renameList(Long ownerId, Long listId, String name) {
        FriendList list = requireOwnList(ownerId, listId);
        if (list.getKind() != FriendList.Kind.CUSTOM) throw ApiException.badRequest("Built-in lists keep their names");
        list.setName(name.trim());
        return toDto(friendListRepository.save(list));
    }

    @Transactional
    public void deleteList(Long ownerId, Long listId) {
        FriendList list = requireOwnList(ownerId, listId);
        if (list.getKind() != FriendList.Kind.CUSTOM) throw ApiException.badRequest("Built-in lists cannot be deleted");
        friendListRepository.delete(list);
    }

    @Transactional
    public FriendListDto setMember(Long ownerId, Long listId, Long userId, boolean include) {
        FriendList list = requireOwnList(ownerId, listId);
        if (include) {
            if (!friendshipRepository.findFriendIds(ownerId).contains(userId)) {
                throw ApiException.badRequest("Only friends can go on a friend list");
            }
            list.getMembers().add(userService.require(userId));
        } else {
            list.getMembers().removeIf(u -> u.getId().equals(userId));
        }
        return toDto(friendListRepository.save(list));
    }

    /** Ids of your lists that include this person. */
    @Transactional(readOnly = true)
    public List<Long> listIdsContaining(Long ownerId, Long userId) {
        return friendListRepository.findListIdsContaining(ownerId, userId);
    }

    @Transactional
    public void ensureDefaults(Long ownerId) {
        User owner = null;
        if (friendListRepository.findFirstByOwnerIdAndKind(ownerId, FriendList.Kind.CLOSE_FRIENDS).isEmpty()) {
            owner = userService.require(ownerId);
            friendListRepository.save(FriendList.builder()
                    .owner(owner).name("Close Friends").kind(FriendList.Kind.CLOSE_FRIENDS).build());
        }
        if (friendListRepository.findFirstByOwnerIdAndKind(ownerId, FriendList.Kind.ACQUAINTANCES).isEmpty()) {
            if (owner == null) owner = userService.require(ownerId);
            friendListRepository.save(FriendList.builder()
                    .owner(owner).name("Acquaintances").kind(FriendList.Kind.ACQUAINTANCES).build());
        }
    }

    private FriendList requireOwnList(Long ownerId, Long listId) {
        FriendList list = friendListRepository.findById(listId).orElseThrow(() -> ApiException.notFound("List"));
        if (!list.getOwner().getId().equals(ownerId)) throw ApiException.forbidden("That list is not yours");
        return list;
    }

    private static FriendListDto toDto(FriendList list) {
        return new FriendListDto(list.getId(), list.getName(), list.getKind().name(),
                list.getMembers().stream()
                        .sorted(Comparator.comparing(User::getFirstName))
                        .map(UserDto::summary).toList());
    }

    // ------------------------------------------------------------------ pokes ---

    /**
     * Pokes someone. If they had poked you, this counts as poking back and
     * clears theirs from your list.
     */
    @Transactional
    public PokeDto poke(Long userId, Long targetId) {
        if (Objects.equals(userId, targetId)) throw ApiException.badRequest("You cannot poke yourself");
        scopeService.requireNotBlocked(userId, targetId);

        pokeRepository.findByPokerIdAndPokedId(targetId, userId).ifPresent(theirs -> {
            theirs.setPending(false);
            pokeRepository.save(theirs);
        });

        User me = userService.require(userId);
        User target = userService.require(targetId);
        Poke mine = pokeRepository.findByPokerIdAndPokedId(userId, targetId)
                .orElseGet(() -> Poke.builder().poker(me).poked(target).count(0).build());
        mine.setCount(mine.getCount() + 1);
        mine.setPending(true);
        mine.setLastPokedAt(Instant.now());
        pokeRepository.save(mine);

        notificationService.raise(target, me, Notification.Type.POKE,
                me.getFullName() + " poked you.", "/pokes", null);
        return new PokeDto(mine.getId(), UserDto.summary(target), mine.getCount(), mine.getLastPokedAt());
    }

    /** People waiting for you to poke them back. */
    @Transactional(readOnly = true)
    public List<PokeDto> pendingPokes(Long userId) {
        Set<Long> hidden = scopeService.hiddenIds(userId);
        return pokeRepository.findPendingFor(userId).stream()
                .filter(p -> !hidden.contains(p.getPoker().getId()))
                .map(p -> new PokeDto(p.getId(), UserDto.summary(p.getPoker()), p.getCount(), p.getLastPokedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PokeDto> sentPokes(Long userId) {
        return pokeRepository.findSentBy(userId).stream()
                .map(p -> new PokeDto(p.getId(), UserDto.summary(p.getPoked()), p.getCount(), p.getLastPokedAt()))
                .toList();
    }

    @Transactional
    public void dismissPoke(Long userId, Long pokeId) {
        pokeRepository.findById(pokeId)
                .filter(p -> p.getPoked().getId().equals(userId))
                .ifPresent(p -> {
                    p.setPending(false);
                    pokeRepository.save(p);
                });
    }

    /** Friends of friends and followers you might want to follow back. */
    @Transactional(readOnly = true)
    public List<UserDto> suggestedToFollow(Long userId, int limit) {
        Set<Long> skip = new HashSet<>(friendshipRepository.findFriendIds(userId));
        skip.addAll(followRepository.findFolloweeIds(userId));
        skip.addAll(scopeService.hiddenIds(userId));
        skip.add(userId);
        return userRepository.findAll().stream()
                .filter(u -> !skip.contains(u.getId()))
                .limit(limit)
                .map(UserDto::summary)
                .toList();
    }
}
