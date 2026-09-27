package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AdRepository extends JpaRepository<Ad, Long> {

    @Query("SELECT a FROM Ad a JOIN FETCH a.advertiser LEFT JOIN FETCH a.page WHERE a.active = true")
    List<Ad> findActive();

    @Query("SELECT a FROM Ad a JOIN FETCH a.advertiser LEFT JOIN FETCH a.page WHERE a.advertiser.id = :userId ORDER BY a.createdAt DESC")
    List<Ad> findByAdvertiser(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Ad a SET a.impressions = a.impressions + 1 WHERE a.id IN :ids")
    void countImpressions(@Param("ids") Collection<Long> ids);

    @Modifying
    @Query("UPDATE Ad x SET x.page = null WHERE x.page.id = :pageId")
    void detachPage(@Param("pageId") Long pageId);
}
