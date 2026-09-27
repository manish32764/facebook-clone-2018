package com.facebookclone.repository;

import com.facebookclone.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    long countByPostId(Long postId);

    @Query("SELECT l.post.id, l.reaction FROM PostLike l WHERE l.user.id = :userId AND l.post.id IN :postIds")
    List<Object[]> findMyReactions(@Param("userId") Long userId, @Param("postIds") Collection<Long> postIds);

    @Query("SELECT l.post.id, COUNT(l) FROM PostLike l WHERE l.post.id IN :postIds GROUP BY l.post.id")
    List<Object[]> countByPostIds(@Param("postIds") Collection<Long> postIds);

    /** postId, reaction, count - drives the little stack of reaction faces. */
    @Query("""
           SELECT l.post.id, l.reaction, COUNT(l) FROM PostLike l
           WHERE l.post.id IN :postIds GROUP BY l.post.id, l.reaction
           """)
    List<Object[]> countByPostIdsGrouped(@Param("postIds") Collection<Long> postIds);

    @Query("""
           SELECT l FROM PostLike l JOIN FETCH l.user
           WHERE l.post.id = :postId ORDER BY l.createdAt DESC
           """)
    List<PostLike> findWithUsers(@Param("postId") Long postId);

    @Modifying
    @Query("DELETE FROM PostLike l WHERE l.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
