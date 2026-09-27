package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FbPageRepository extends JpaRepository<FbPage, Long> {

    @Query("SELECT p FROM FbPage p JOIN FETCH p.owner WHERE p.owner.id = :ownerId ORDER BY p.name")
    List<FbPage> findOwned(@Param("ownerId") Long ownerId);

    @Query("SELECT p FROM FbPage p JOIN FETCH p.owner ORDER BY p.createdAt DESC")
    List<FbPage> findAllWithOwner();

    @Query("""
           SELECT p FROM FbPage p JOIN FETCH p.owner
           WHERE LOWER(p.name) LIKE LOWER(CONCAT(:wild, :q, :wild))
              OR LOWER(p.category) LIKE LOWER(CONCAT(:wild, :q, :wild))
           ORDER BY p.name
           """)
    List<FbPage> searchWild(@Param("q") String q, @Param("wild") String wild);

    default List<FbPage> search(String q) {
        return searchWild(q, "%");
    }
}
