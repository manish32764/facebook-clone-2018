package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BlockRepository extends JpaRepository<Block, Long> {

    Optional<Block> findByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    @Query("SELECT b.blocked.id FROM Block b WHERE b.blocker.id = :userId")
    List<Long> findBlockedIds(@Param("userId") Long userId);

    @Query("SELECT b.blocker.id FROM Block b WHERE b.blocked.id = :userId")
    List<Long> findBlockerIds(@Param("userId") Long userId);

    @Query("SELECT b FROM Block b JOIN FETCH b.blocked WHERE b.blocker.id = :userId ORDER BY b.createdAt DESC")
    List<Block> findByBlocker(@Param("userId") Long userId);
}
