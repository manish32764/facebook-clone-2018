package com.facebookclone.service;

import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.BlockRepository;
import com.facebookclone.repository.FriendshipRepository;
import com.facebookclone.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/** Builds {@link ViewerScope}s and answers "are these two people blocked from each other?". */
@Service
@RequiredArgsConstructor
public class ViewerScopeService {

    private final FriendshipRepository friendshipRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final BlockRepository blockRepository;

    @Transactional(readOnly = true)
    public ViewerScope of(Long viewerId) {
        return new ViewerScope(
                viewerId,
                friendshipRepository.findFriendIds(viewerId),
                groupMemberRepository.findGroupIds(viewerId),
                hiddenIds(viewerId));
    }

    /** Everyone the viewer blocked plus everyone who blocked the viewer. */
    @Transactional(readOnly = true)
    public Set<Long> hiddenIds(Long viewerId) {
        Set<Long> hidden = new HashSet<>(blockRepository.findBlockedIds(viewerId));
        hidden.addAll(blockRepository.findBlockerIds(viewerId));
        return hidden;
    }

    @Transactional(readOnly = true)
    public boolean blockedEitherWay(Long a, Long b) {
        if (a == null || b == null || Objects.equals(a, b)) return false;
        return blockRepository.existsByBlockerIdAndBlockedId(a, b)
                || blockRepository.existsByBlockerIdAndBlockedId(b, a);
    }

    /** A blocked profile reads as missing, the way the real product hides it. */
    @Transactional(readOnly = true)
    public void requireNotBlocked(Long viewerId, Long otherId) {
        if (blockedEitherWay(viewerId, otherId)) {
            throw ApiException.notFound("User");
        }
    }
}
