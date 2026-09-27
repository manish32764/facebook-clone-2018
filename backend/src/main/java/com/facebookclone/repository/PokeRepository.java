package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PokeRepository extends JpaRepository<Poke, Long> {

    Optional<Poke> findByPokerIdAndPokedId(Long pokerId, Long pokedId);

    @Query("SELECT p FROM Poke p JOIN FETCH p.poker WHERE p.poked.id = :userId AND p.pending = true ORDER BY p.lastPokedAt DESC")
    List<Poke> findPendingFor(@Param("userId") Long userId);

    @Query("SELECT p FROM Poke p JOIN FETCH p.poked WHERE p.poker.id = :userId AND p.pending = true ORDER BY p.lastPokedAt DESC")
    List<Poke> findSentBy(@Param("userId") Long userId);

    long countByPokedIdAndPendingTrue(Long pokedId);
}
