package com.facebookclone.repository;

import com.facebookclone.entity.Story;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface StoryRepository extends JpaRepository<Story, Long> {

    /** Live stories from a set of authors, oldest first inside each author. */
    @Query("""
           SELECT s FROM Story s JOIN FETCH s.author
           WHERE s.author.id IN :authorIds AND s.expiresAt > :now
           ORDER BY s.author.id ASC, s.createdAt ASC
           """)
    List<Story> findLive(@Param("authorIds") Collection<Long> authorIds, @Param("now") Instant now);

    /** Your story archive: everything you ever posted, newest first. */
    @Query("SELECT s FROM Story s WHERE s.author.id = :authorId ORDER BY s.createdAt DESC")
    List<Story> findArchive(@Param("authorId") Long authorId);
}
