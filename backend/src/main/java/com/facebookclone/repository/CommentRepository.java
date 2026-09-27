package com.facebookclone.repository;

import com.facebookclone.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("""
           SELECT c FROM Comment c JOIN FETCH c.author LEFT JOIN FETCH c.parent
           WHERE c.post.id = :postId ORDER BY c.createdAt ASC
           """)
    List<Comment> findByPost(@Param("postId") Long postId);

    @Query("""
           SELECT c FROM Comment c JOIN FETCH c.author LEFT JOIN FETCH c.parent
           WHERE c.post.id IN :postIds ORDER BY c.createdAt ASC
           """)
    List<Comment> findByPostIds(@Param("postIds") Collection<Long> postIds);

    @Query("SELECT c.post.id, COUNT(c) FROM Comment c WHERE c.post.id IN :postIds GROUP BY c.post.id")
    List<Object[]> countByPostIds(@Param("postIds") Collection<Long> postIds);

    @Modifying
    @Query("UPDATE Comment c SET c.parent = null WHERE c.post.id = :postId")
    void detachParents(@Param("postId") Long postId);

    @Modifying
    @Query("DELETE FROM Comment c WHERE c.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
