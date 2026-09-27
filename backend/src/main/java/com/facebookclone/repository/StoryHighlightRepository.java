package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StoryHighlightRepository extends JpaRepository<StoryHighlight, Long> {

    @Query("SELECT DISTINCT h FROM StoryHighlight h LEFT JOIN FETCH h.stories WHERE h.owner.id = :ownerId ORDER BY h.createdAt ASC")
    List<StoryHighlight> findForOwner(@Param("ownerId") Long ownerId);

    @Query("SELECT h FROM StoryHighlight h JOIN h.stories s WHERE s.id = :storyId")
    List<StoryHighlight> findContaining(@Param("storyId") Long storyId);
}
