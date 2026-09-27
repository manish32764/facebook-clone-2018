package com.facebookclone.repository;

import com.facebookclone.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, Long userId);

    @Query("SELECT l.comment.id, COUNT(l) FROM CommentLike l WHERE l.comment.id IN :ids GROUP BY l.comment.id")
    List<Object[]> countByCommentIds(@Param("ids") Collection<Long> ids);

    /** commentId, reaction, count - the face stack on a comment bubble. */
    @Query("""
           SELECT l.comment.id, l.reaction, COUNT(l) FROM CommentLike l
           WHERE l.comment.id IN :ids GROUP BY l.comment.id, l.reaction
           """)
    List<Object[]> countByCommentIdsGrouped(@Param("ids") Collection<Long> ids);

    @Query("SELECT l.comment.id, l.reaction FROM CommentLike l WHERE l.user.id = :userId AND l.comment.id IN :ids")
    List<Object[]> findMyReactions(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    @Query("SELECT l.comment.id FROM CommentLike l WHERE l.user.id = :userId AND l.comment.id IN :ids")
    List<Long> findLikedCommentIds(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM CommentLike l WHERE l.comment.id IN :ids")
    void deleteByCommentIds(@Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM CommentLike l WHERE l.comment.id IN (SELECT c.id FROM Comment c WHERE c.post.id = :postId)")
    void deleteForPost(@Param("postId") Long postId);
}
