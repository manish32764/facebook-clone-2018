package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DatingSwipeRepository extends JpaRepository<DatingSwipe, Long> {

    Optional<DatingSwipe> findByFromIdAndToId(Long fromId, Long toId);

    @Query("SELECT s.to.id FROM DatingSwipe s WHERE s.from.id = :userId")
    List<Long> findSwipedIds(@Param("userId") Long userId);

    /** People I liked who also liked me. */
    @Query("""
           SELECT s.to.id FROM DatingSwipe s
           WHERE s.from.id = :userId AND s.liked = true
             AND EXISTS (SELECT 1 FROM DatingSwipe back
                         WHERE back.from.id = s.to.id AND back.to.id = :userId AND back.liked = true)
           """)
    List<Long> findMatchIds(@Param("userId") Long userId);

    long countByToIdAndLikedTrue(Long toId);
}
