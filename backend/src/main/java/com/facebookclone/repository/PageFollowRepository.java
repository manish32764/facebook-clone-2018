package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PageFollowRepository extends JpaRepository<PageFollow, Long> {

    Optional<PageFollow> findByPageIdAndUserId(Long pageId, Long userId);

    @Query("SELECT f.page.id, COUNT(f) FROM PageFollow f WHERE f.page.id IN :ids AND f.liked = true GROUP BY f.page.id")
    List<Object[]> countLikes(@Param("ids") Collection<Long> ids);

    @Query("SELECT f.page.id, COUNT(f) FROM PageFollow f WHERE f.page.id IN :ids AND f.following = true GROUP BY f.page.id")
    List<Object[]> countFollowers(@Param("ids") Collection<Long> ids);

    @Query("SELECT f FROM PageFollow f WHERE f.user.id = :userId AND f.page.id IN :ids")
    List<PageFollow> findMine(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    @Query("SELECT f.page.id FROM PageFollow f WHERE f.user.id = :userId AND f.following = true")
    List<Long> findFollowedPageIds(@Param("userId") Long userId);

    @Query("SELECT f.page.id FROM PageFollow f WHERE f.user.id = :userId AND (f.following = true OR f.liked = true)")
    List<Long> findConnectedPageIds(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM PageFollow f WHERE f.page.id = :pageId")
    void deleteByPageId(@Param("pageId") Long pageId);
}
