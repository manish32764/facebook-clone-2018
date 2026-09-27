package com.facebookclone.repository;

import com.facebookclone.entity.SocialGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SocialGroupRepository extends JpaRepository<SocialGroup, Long> {

    @Query("""
           SELECT g FROM SocialGroup g
           WHERE EXISTS (SELECT 1 FROM GroupMember m WHERE m.group = g AND m.user.id = :userId)
           ORDER BY g.name ASC
           """)
    List<SocialGroup> findJoined(@Param("userId") Long userId);

    @Query("""
           SELECT g FROM SocialGroup g
           WHERE NOT EXISTS (SELECT 1 FROM GroupMember m WHERE m.group = g AND m.user.id = :userId)
             AND g.privacy = com.facebookclone.entity.SocialGroup.Privacy.PUBLIC
           ORDER BY g.createdAt DESC
           """)
    List<SocialGroup> findDiscoverable(@Param("userId") Long userId);

    @Query("SELECT g FROM SocialGroup g WHERE LOWER(g.name) LIKE LOWER(CONCAT(:wild, :q, :wild)) ORDER BY g.name")
    List<SocialGroup> searchWild(@Param("q") String q, @Param("wild") String wild);

    default List<SocialGroup> search(String q) {
        return searchWild(q, "%");
    }
}
