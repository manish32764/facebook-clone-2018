package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PageReviewRepository extends JpaRepository<PageReview, Long> {

    Optional<PageReview> findByPageIdAndAuthorId(Long pageId, Long authorId);

    @Query("SELECT r FROM PageReview r JOIN FETCH r.author WHERE r.page.id = :pageId ORDER BY r.createdAt DESC")
    List<PageReview> findForPage(@Param("pageId") Long pageId);

    @Modifying
    @Query("DELETE FROM PageReview r WHERE r.page.id = :pageId")
    void deleteByPageId(@Param("pageId") Long pageId);
}
