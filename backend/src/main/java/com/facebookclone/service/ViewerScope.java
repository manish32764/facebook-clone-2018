package com.facebookclone.service;

import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * What a post query needs to know about the person looking: who their friends
 * are, which groups they are in, and who they must never see. The list
 * accessors never return an empty list, because JPQL cannot take an empty IN.
 */
public record ViewerScope(Long viewerId, List<Long> friendIds, List<Long> groupIds, Set<Long> hiddenIds) {

    static final List<Long> NO_IDS = List.of(-1L);

    public List<Long> friends() {
        return orSentinel(friendIds);
    }

    public List<Long> groups() {
        return orSentinel(groupIds);
    }

    public List<Long> hidden() {
        return orSentinel(hiddenIds);
    }

    public boolean hides(Long userId) {
        return hiddenIds.contains(userId);
    }

    public static List<Long> orSentinel(Collection<Long> ids) {
        return ids == null || ids.isEmpty() ? NO_IDS : List.copyOf(ids);
    }
}
