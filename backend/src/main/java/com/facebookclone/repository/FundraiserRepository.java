package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FundraiserRepository extends JpaRepository<Fundraiser, Long> {

    @Query("SELECT f FROM Fundraiser f JOIN FETCH f.creator ORDER BY f.closed ASC, f.createdAt DESC")
    List<Fundraiser> findAllWithCreator();

    @Query("SELECT f FROM Fundraiser f JOIN FETCH f.creator WHERE f.creator.id = :userId ORDER BY f.createdAt DESC")
    List<Fundraiser> findByCreator(@Param("userId") Long userId);

    @Query("""
           SELECT f FROM Fundraiser f JOIN FETCH f.creator
           WHERE LOWER(f.title) LIKE LOWER(CONCAT(:wild, :q, :wild)) ORDER BY f.createdAt DESC
           """)
    List<Fundraiser> searchWild(@Param("q") String q, @Param("wild") String wild);

    default List<Fundraiser> search(String q) {
        return searchWild(q, "%");
    }
}
