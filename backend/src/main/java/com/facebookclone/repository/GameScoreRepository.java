package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GameScoreRepository extends JpaRepository<GameScore, Long> {

    @Query("""
           SELECT s.user.id, MAX(s.score) FROM GameScore s
           WHERE s.game = :game AND s.user.id IN :userIds GROUP BY s.user.id
           """)
    List<Object[]> bestByUser(@Param("game") String game, @Param("userIds") Collection<Long> userIds);

    @Query("SELECT s.game, MAX(s.score), COUNT(s) FROM GameScore s WHERE s.user.id = :userId GROUP BY s.game")
    List<Object[]> myStats(@Param("userId") Long userId);
}
