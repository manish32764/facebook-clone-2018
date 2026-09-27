package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FriendListRepository extends JpaRepository<FriendList, Long> {

    List<FriendList> findByOwnerIdOrderByKindAscNameAsc(Long ownerId);

    Optional<FriendList> findFirstByOwnerIdAndKind(Long ownerId, FriendList.Kind kind);

    /** The lists of `owner` that include `userId`. */
    @Query("SELECT l.id FROM FriendList l JOIN l.members m WHERE l.owner.id = :owner AND m.id = :userId")
    List<Long> findListIdsContaining(@Param("owner") Long owner, @Param("userId") Long userId);

    @Query("SELECT m.id FROM FriendList l JOIN l.members m WHERE l.owner.id = :owner AND l.kind = :kind")
    List<Long> findMemberIds(@Param("owner") Long owner, @Param("kind") FriendList.Kind kind);

    /** People who have `userId` on their Close Friends list. */
    @Query("""
           SELECT l.owner.id FROM FriendList l JOIN l.members m
           WHERE l.kind = com.facebookclone.entity.FriendList.Kind.CLOSE_FRIENDS AND m.id = :userId
           """)
    List<Long> findOwnersWithCloseFriend(@Param("userId") Long userId);
}
