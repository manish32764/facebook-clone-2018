package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StoryReactionRepository extends JpaRepository<StoryReaction, Long> {

    @Query("SELECT r FROM StoryReaction r JOIN FETCH r.user WHERE r.story.id = :storyId ORDER BY r.createdAt DESC")
    List<StoryReaction> findForStory(@Param("storyId") Long storyId);

    @Query("SELECT r.story.id, COUNT(r) FROM StoryReaction r WHERE r.story.id IN :ids GROUP BY r.story.id")
    List<Object[]> countByStoryIds(@Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM StoryReaction r WHERE r.story.id = :storyId")
    void deleteByStoryId(@Param("storyId") Long storyId);
}
