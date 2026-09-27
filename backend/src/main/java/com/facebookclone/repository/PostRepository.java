package com.facebookclone.repository;

import com.facebookclone.entity.Post;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Every read that shows posts to someone goes through {@link #VISIBLE}, so the
 * audience rules live in exactly one place. The fragment expects the post as
 * {@code p}, its group LEFT JOINed as {@code g}, and four parameters:
 * viewerId, friendIds (the viewer's friends), groupIds (groups the viewer is
 * in) and hiddenIds (people the viewer blocked or was blocked by). Id lists
 * are never empty - the service passes a -1 sentinel instead.
 */
public interface PostRepository extends JpaRepository<Post, Long> {

    String VISIBLE = """
             p.author.id NOT IN :hiddenIds
             AND p.pending = false
             AND NOT EXISTS (SELECT 1 FROM HiddenPost hp WHERE hp.post.id = p.id AND hp.user.id = :viewerId)
             AND (p.author.id = :viewerId
               OR (g IS NOT NULL AND (g.privacy = com.facebookclone.entity.SocialGroup.Privacy.PUBLIC
                                      OR g.id IN :groupIds))
               OR (g IS NULL AND (
                     p.privacy = com.facebookclone.entity.Post.Privacy.PUBLIC
                  OR p.wallOwner.id = :viewerId
                  OR (p.privacy = com.facebookclone.entity.Post.Privacy.FRIENDS AND p.author.id IN :friendIds)
                  OR (p.privacy = com.facebookclone.entity.Post.Privacy.FRIENDS_EXCEPT AND p.author.id IN :friendIds
                      AND NOT EXISTS (SELECT 1 FROM Post xa JOIN xa.audience xu
                                      WHERE xa.id = p.id AND xu.id = :viewerId))
                  OR (p.privacy = com.facebookclone.entity.Post.Privacy.SPECIFIC
                      AND EXISTS (SELECT 1 FROM Post sa JOIN sa.audience su
                                  WHERE sa.id = p.id AND su.id = :viewerId))
                  OR (p.privacy = com.facebookclone.entity.Post.Privacy.CLOSE_FRIENDS
                      AND EXISTS (SELECT 1 FROM FriendList fl JOIN fl.members fm
                                  WHERE fl.owner.id = p.author.id
                                    AND fl.kind = com.facebookclone.entity.FriendList.Kind.CLOSE_FRIENDS
                                    AND fm.id = :viewerId)))))
            """;

    /**
     * The News Feed: timeline posts from you, your friends and people you
     * follow, posts on your own wall, posts from your groups and from Pages
     * you follow - each still subject to its audience.
     */
    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN p.group g
           WHERE ((g IS NULL AND p.page IS NULL
                   AND (p.author.id IN :authorIds OR p.wallOwner.id = :viewerId))
                  OR g.id IN :groupIds
                  OR p.page.id IN :pageIds)
             AND """ + VISIBLE + """
           ORDER BY p.createdAt DESC
           """)
    List<Post> findFeed(@Param("authorIds") Collection<Long> authorIds,
                        @Param("pageIds") Collection<Long> pageIds,
                        @Param("viewerId") Long viewerId,
                        @Param("friendIds") Collection<Long> friendIds,
                        @Param("groupIds") Collection<Long> groupIds,
                        @Param("hiddenIds") Collection<Long> hiddenIds,
                        Pageable pageable);

    /** A person's timeline: what they posted, plus what friends wrote on it. Pinned first. */
    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN p.group g
           WHERE g IS NULL AND p.page IS NULL
             AND ((p.author.id = :profileId AND p.wallOwner IS NULL) OR p.wallOwner.id = :profileId)
             AND """ + VISIBLE + """
           ORDER BY p.pinned DESC, p.createdAt DESC
           """)
    List<Post> findTimeline(@Param("profileId") Long profileId,
                            @Param("viewerId") Long viewerId,
                            @Param("friendIds") Collection<Long> friendIds,
                            @Param("groupIds") Collection<Long> groupIds,
                            @Param("hiddenIds") Collection<Long> hiddenIds,
                            Pageable pageable);

    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author JOIN p.group g
           WHERE g.id = :groupId AND p.pending = false AND p.author.id NOT IN :hiddenIds
           ORDER BY p.pinned DESC, p.createdAt DESC
           """)
    List<Post> findByGroup(@Param("groupId") Long groupId,
                           @Param("hiddenIds") Collection<Long> hiddenIds,
                           Pageable pageable);

    /** Posts waiting for a group admin, oldest first. */
    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author
           WHERE p.group.id = :groupId AND p.pending = true
           ORDER BY p.createdAt ASC
           """)
    List<Post> findPendingInGroup(@Param("groupId") Long groupId);

    long countByGroupIdAndPendingTrue(Long groupId);

    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN p.group g
           WHERE p.page.id = :pageId AND """ + VISIBLE + """
           ORDER BY p.pinned DESC, p.createdAt DESC
           """)
    List<Post> findByPage(@Param("pageId") Long pageId,
                          @Param("viewerId") Long viewerId,
                          @Param("friendIds") Collection<Long> friendIds,
                          @Param("groupIds") Collection<Long> groupIds,
                          @Param("hiddenIds") Collection<Long> hiddenIds,
                          Pageable pageable);

    /** Watch: everything with a video the viewer is allowed to see, newest first. */
    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN p.group g
           WHERE p.videoUrl IS NOT NULL AND """ + VISIBLE + """
           ORDER BY p.createdAt DESC
           """)
    List<Post> findVideos(@Param("viewerId") Long viewerId,
                          @Param("friendIds") Collection<Long> friendIds,
                          @Param("groupIds") Collection<Long> groupIds,
                          @Param("hiddenIds") Collection<Long> hiddenIds,
                          Pageable pageable);

    /** One post, only if the viewer may see it. */
    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN p.group g
           WHERE p.id = :postId AND """ + VISIBLE)
    Optional<Post> findVisible(@Param("postId") Long postId,
                               @Param("viewerId") Long viewerId,
                               @Param("friendIds") Collection<Long> friendIds,
                               @Param("groupIds") Collection<Long> groupIds,
                               @Param("hiddenIds") Collection<Long> hiddenIds);

    @Query("SELECT p FROM Post p JOIN FETCH p.author WHERE p.id IN :ids ORDER BY p.createdAt DESC")
    List<Post> findAllByIds(@Param("ids") Collection<Long> ids);

    /** On This Day: your own posts published in the same window in earlier years. */
    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author
           WHERE p.author.id = :authorId AND p.createdAt < :before AND p.pending = false
           ORDER BY p.createdAt DESC
           """)
    List<Post> findOlderThan(@Param("authorId") Long authorId, @Param("before") Instant before, Pageable pageable);

    @Query("""
           SELECT p FROM Post p JOIN FETCH p.author LEFT JOIN p.group g
           WHERE LOWER(p.content) LIKE LOWER(CONCAT(:wild, :q, :wild)) AND """ + VISIBLE + """
           ORDER BY p.createdAt DESC
           """)
    List<Post> search(@Param("q") String q,
                      @Param("wild") String wild,
                      @Param("viewerId") Long viewerId,
                      @Param("friendIds") Collection<Long> friendIds,
                      @Param("groupIds") Collection<Long> groupIds,
                      @Param("hiddenIds") Collection<Long> hiddenIds,
                      Pageable pageable);

    @Query("SELECT p.sharedPost.id, COUNT(p) FROM Post p WHERE p.sharedPost.id IN :ids GROUP BY p.sharedPost.id")
    List<Object[]> countShares(@Param("ids") Collection<Long> ids);

    @Query("SELECT p FROM Post p WHERE p.group.id = :groupId")
    List<Post> findAllInGroup(@Param("groupId") Long groupId);

    @Query("SELECT p FROM Post p WHERE p.page.id = :pageId")
    List<Post> findAllOnPage(@Param("pageId") Long pageId);

    /** A deleted original leaves its re-shares standing, pointing at nothing. */
    @Modifying
    @Query("UPDATE Post p SET p.sharedPost = null WHERE p.sharedPost.id = :postId")
    void detachShares(@Param("postId") Long postId);
}
