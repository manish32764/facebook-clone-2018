package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * One person's reaction to a post. The table keeps its original name so existing
 * rows survive; what used to be a bare like now carries a ReactionType, with
 * LIKE as the default so old rows read correctly.
 */
@Entity
@Table(name = "post_likes",
       uniqueConstraints = @UniqueConstraint(name = "uk_like_post_user", columnNames = {"post_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction", length = 20)
    @Builder.Default
    private ReactionType reaction = ReactionType.LIKE;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /** Rows written before reactions existed have a null column. */
    public ReactionType reactionOrLike() {
        return reaction == null ? ReactionType.LIKE : reaction;
    }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
        if (reaction == null) reaction = ReactionType.LIKE;
    }
}
