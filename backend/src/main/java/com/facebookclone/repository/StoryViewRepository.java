package com.facebookclone.repository;

import com.facebookclone.entity.StoryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface StoryViewRepository extends JpaRepository<StoryView, Long> {

    boolean existsByStoryIdAndViewerId(Long storyId, Long viewerId);

    @Query("SELECT v.story.id FROM StoryView v WHERE v.viewer.id = :viewerId AND v.story.id IN :storyIds")
    List<Long> findSeenStoryIds(@Param("viewerId") Long viewerId, @Param("storyIds") Collection<Long> storyIds);

    @Query("SELECT v.story.id, COUNT(v) FROM StoryView v WHERE v.story.id IN :storyIds GROUP BY v.story.id")
    List<Object[]> countByStoryIds(@Param("storyIds") Collection<Long> storyIds);

    @Query("SELECT v FROM StoryView v JOIN FETCH v.viewer WHERE v.story.id = :storyId ORDER BY v.viewedAt DESC")
    List<StoryView> findForStory(@Param("storyId") Long storyId);

    @Modifying
    @Query("DELETE FROM StoryView v WHERE v.story.id = :storyId")
    void deleteByStoryId(@Param("storyId") Long storyId);
}
