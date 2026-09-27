package com.facebookclone.repository;

import com.facebookclone.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("""
           SELECT f FROM Friendship f
           WHERE (f.requester.id = :a AND f.addressee.id = :b)
              OR (f.requester.id = :b AND f.addressee.id = :a)
           """)
    Optional<Friendship> findBetween(@Param("a") Long a, @Param("b") Long b);

    @Query("""
           SELECT CASE WHEN f.requester.id = :userId THEN f.addressee.id ELSE f.requester.id END
           FROM Friendship f
           WHERE f.status = :status
             AND (f.requester.id = :userId OR f.addressee.id = :userId)
           """)
    List<Long> findFriendIdsByStatus(@Param("userId") Long userId, @Param("status") Friendship.Status status);

    default List<Long> findFriendIds(Long userId) {
        return findFriendIdsByStatus(userId, Friendship.Status.ACCEPTED);
    }

    @Query("""
           SELECT f FROM Friendship f
           JOIN FETCH f.requester
           WHERE f.addressee.id = :userId AND f.status = :status
           ORDER BY f.createdAt DESC
           """)
    List<Friendship> findByAddresseeAndStatus(@Param("userId") Long userId, @Param("status") Friendship.Status status);

    default List<Friendship> findIncomingRequests(Long userId) {
        return findByAddresseeAndStatus(userId, Friendship.Status.PENDING);
    }

    @Query("""
           SELECT f FROM Friendship f
           JOIN FETCH f.addressee
           WHERE f.requester.id = :userId AND f.status = :status
           ORDER BY f.createdAt DESC
           """)
    List<Friendship> findByRequesterAndStatus(@Param("userId") Long userId, @Param("status") Friendship.Status status);

    default List<Friendship> findOutgoingRequests(Long userId) {
        return findByRequesterAndStatus(userId, Friendship.Status.PENDING);
    }
}
