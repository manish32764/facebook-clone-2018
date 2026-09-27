package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface HiddenPostRepository extends JpaRepository<HiddenPost, Long> {

    Optional<HiddenPost> findByUserIdAndPostId(Long userId, Long postId);

    @Modifying
    @Query("DELETE FROM HiddenPost h WHERE h.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
