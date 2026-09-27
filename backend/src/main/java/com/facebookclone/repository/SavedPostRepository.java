package com.facebookclone.repository;

import com.facebookclone.entity.SavedPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SavedPostRepository extends JpaRepository<SavedPost, Long> {

    Optional<SavedPost> findByUserIdAndPostId(Long userId, Long postId);

    @Query("SELECT s.post.id FROM SavedPost s WHERE s.user.id = :userId AND s.post.id IN :postIds")
    List<Long> findSavedPostIds(@Param("userId") Long userId, @Param("postIds") Collection<Long> postIds);

    @Query("SELECT s.post.id FROM SavedPost s WHERE s.user.id = :userId ORDER BY s.createdAt DESC")
    List<Long> findAllSavedPostIds(@Param("userId") Long userId);

    long countByUserId(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM SavedPost s WHERE s.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
