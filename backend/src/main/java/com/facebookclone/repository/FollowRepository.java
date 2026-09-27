package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    Optional<Follow> findByFollowerIdAndFolloweeId(Long followerId, Long followeeId);

    boolean existsByFollowerIdAndFolloweeId(Long followerId, Long followeeId);

    long countByFolloweeId(Long followeeId);

    long countByFollowerId(Long followerId);

    @Query("SELECT f.followee.id FROM Follow f WHERE f.follower.id = :userId")
    List<Long> findFolloweeIds(@Param("userId") Long userId);

    @Query("SELECT f.follower.id FROM Follow f WHERE f.followee.id = :userId")
    List<Long> findFollowerIds(@Param("userId") Long userId);

    @Query("SELECT f FROM Follow f JOIN FETCH f.followee WHERE f.follower.id = :userId ORDER BY f.createdAt DESC")
    List<Follow> findFollowing(@Param("userId") Long userId);

    @Query("SELECT f FROM Follow f JOIN FETCH f.follower WHERE f.followee.id = :userId ORDER BY f.createdAt DESC")
    List<Follow> findFollowers(@Param("userId") Long userId);

    @Modifying
    @Query("""
           DELETE FROM Follow f
           WHERE (f.follower.id = :a AND f.followee.id = :b) OR (f.follower.id = :b AND f.followee.id = :a)
           """)
    void deleteBetween(@Param("a") Long a, @Param("b") Long b);
}
