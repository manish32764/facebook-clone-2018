package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    @Query("SELECT j FROM JobPosting j JOIN FETCH j.poster LEFT JOIN FETCH j.page WHERE j.open = true ORDER BY j.createdAt DESC")
    List<JobPosting> findOpen();

    @Query("SELECT j FROM JobPosting j JOIN FETCH j.poster LEFT JOIN FETCH j.page WHERE j.poster.id = :userId ORDER BY j.createdAt DESC")
    List<JobPosting> findByPoster(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE JobPosting x SET x.page = null WHERE x.page.id = :pageId")
    void detachPage(@Param("pageId") Long pageId);
}
