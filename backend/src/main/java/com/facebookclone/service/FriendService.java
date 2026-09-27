package com.facebookclone.service;

import com.facebookclone.dto.FriendDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.Friendship;
import com.facebookclone.entity.Notification;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.FriendshipRepository;
import com.facebookclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final NotificationService notificationService;
    private final PresenceService presenceService;
    private final ViewerScopeService scopeService;

    @Transactional(readOnly = true)
    public List<FriendDto> friendsOf(Long userId, Long viewerId) {
        List<Long> friendIds = friendshipRepository.findFriendIds(userId);
        if (friendIds.isEmpty()) return List.of();

        Set<Long> viewerFriends = new HashSet<>(friendshipRepository.findFriendIds(viewerId));
        Set<Long> hidden = scopeService.hiddenIds(viewerId);
        return userRepository.findAllById(friendIds).stream()
                .filter(u -> !hidden.contains(u.getId()))
                .map(u -> new FriendDto(UserDto.summary(u), relationship(viewerId, u.getId()),
                        mutualCount(viewerFriends, u.getId(), viewerId)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FriendRequestDto> incomingRequests(Long userId) {
        return friendshipRepository.findIncomingRequests(userId).stream()
                .map(f -> new FriendRequestDto(f.getId(), UserDto.summary(f.getRequester()), f.getCreatedAt()))
                .toList();
    }

    /** People you are not connected to yet, ranked by shared friends. */
    @Transactional(readOnly = true)
    public List<FriendDto> suggestions(Long userId, int limit) {
        Set<Long> myFriends = new HashSet<>(friendshipRepository.findFriendIds(userId));
        Set<Long> hidden = scopeService.hiddenIds(userId);

        return userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(userId))
                .filter(u -> !hidden.contains(u.getId()))
                .filter(u -> !myFriends.contains(u.getId()))
                .filter(u -> relationship(userId, u.getId()).equals("NONE"))
                .map(u -> new FriendDto(UserDto.summary(u), "NONE", mutualCount(myFriends, u.getId(), userId)))
                .sorted(Comparator.comparingInt(FriendDto::mutualFriends).reversed())
                .limit(limit)
                .toList();
    }

    @Transactional
    public FriendDto sendRequest(Long requesterId, Long addresseeId) {
        if (requesterId.equals(addresseeId)) {
            throw ApiException.badRequest("You cannot add yourself as a friend");
        }
        scopeService.requireNotBlocked(requesterId, addresseeId);
        User addressee = userService.require(addresseeId);

        friendshipRepository.findBetween(requesterId, addresseeId).ifPresent(existing -> {
            throw ApiException.conflict("A friend request already exists between you two");
        });

        User requester = userService.require(requesterId);
        friendshipRepository.save(Friendship.builder()
                .requester(requester)
                .addressee(addressee)
                .status(Friendship.Status.PENDING)
                .build());

        notificationService.raise(addressee, requester, Notification.Type.FRIEND_REQUEST,
                requester.getFullName() + " sent you a friend request.",
                "/friends", null);

        return new FriendDto(UserDto.summary(addressee), "REQUEST_SENT", 0);
    }

    @Transactional
    public FriendDto respond(Long requestId, Long userId, boolean accept) {
        Friendship friendship = friendshipRepository.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Friend request"));

        if (!friendship.getAddressee().getId().equals(userId)) {
            throw ApiException.forbidden("This request was not sent to you");
        }

        friendship.setStatus(accept ? Friendship.Status.ACCEPTED : Friendship.Status.DECLINED);
        friendshipRepository.save(friendship);

        if (accept) {
            notificationService.raise(friendship.getRequester(), friendship.getAddressee(),
                    Notification.Type.FRIEND_ACCEPTED,
                    friendship.getAddressee().getFullName() + " accepted your friend request.",
                    "/profile/" + friendship.getAddressee().getId(), null);
        }

        return new FriendDto(UserDto.summary(friendship.getRequester()),
                accept ? "FRIENDS" : "NONE", 0);
    }

    @Transactional
    public void removeFriend(Long userId, Long otherId) {
        friendshipRepository.findBetween(userId, otherId)
                .ifPresentOrElse(friendshipRepository::delete,
                        () -> { throw ApiException.notFound("Friendship"); });
    }

    @Transactional(readOnly = true)
    public String relationship(Long viewerId, Long otherId) {
        if (Objects.equals(viewerId, otherId)) return "SELF";

        return friendshipRepository.findBetween(viewerId, otherId)
                .map(f -> switch (f.getStatus()) {
                    case ACCEPTED -> "FRIENDS";
                    case PENDING -> f.getRequester().getId().equals(viewerId) ? "REQUEST_SENT" : "REQUEST_RECEIVED";
                    case DECLINED -> "NONE";
                })
                .orElse("NONE");
    }

    /** The id of a pending request between the two, in either direction, or null. */
    @Transactional(readOnly = true)
    public Long pendingRequestId(Long viewerId, Long otherId) {
        return friendshipRepository.findBetween(viewerId, otherId)
                .filter(f -> f.getStatus() == Friendship.Status.PENDING)
                .map(Friendship::getId)
                .orElse(null);
    }

    /** Requests you have sent and nobody has answered yet. */
    @Transactional(readOnly = true)
    public List<SentRequestDto> outgoingRequests(Long userId) {
        return friendshipRepository.findOutgoingRequests(userId).stream()
                .map(f -> new SentRequestDto(f.getId(), UserDto.summary(f.getAddressee()), f.getCreatedAt()))
                .toList();
    }

    /** Withdraws a request you sent. */
    @Transactional
    public void cancelRequest(Long requestId, Long userId) {
        Friendship friendship = friendshipRepository.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Friend request"));
        if (!friendship.getRequester().getId().equals(userId)) {
            throw ApiException.forbidden("That request is not yours to cancel");
        }
        friendshipRepository.delete(friendship);
    }

    /** The people you and someone else both know. */
    @Transactional(readOnly = true)
    public MutualFriendsDto mutualFriends(Long viewerId, Long otherId) {
        Set<Long> mine = new HashSet<>(friendshipRepository.findFriendIds(viewerId));
        List<Long> theirs = friendshipRepository.findFriendIds(otherId);

        List<Long> shared = theirs.stream()
                .filter(mine::contains)
                .filter(id -> !id.equals(viewerId))
                .toList();

        return new MutualFriendsDto(
                userRepository.findAllById(shared).stream().map(UserDto::summary).toList(),
                shared.size());
    }

    /** Friend ids that count as online right now, for the contacts rail. */
    @Transactional(readOnly = true)
    public Set<Long> onlineFriendIds(Long userId) {
        return presenceService.onlineAmong(friendshipRepository.findFriendIds(userId));
    }

    private int mutualCount(Set<Long> viewerFriends, Long otherId, Long viewerId) {
        if (Objects.equals(otherId, viewerId)) return 0;
        Set<Long> theirFriends = new HashSet<>(friendshipRepository.findFriendIds(otherId));
        theirFriends.retainAll(viewerFriends);
        theirFriends.remove(viewerId);
        return theirFriends.size();
    }
}
