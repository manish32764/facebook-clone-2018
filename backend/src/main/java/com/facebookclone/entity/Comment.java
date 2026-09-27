package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A comment on a post. Replies point at their parent comment, one level deep -
 * the same shape Facebook uses, where a reply to a reply still lands in the
 * parent's thread rather than nesting further.
 */
@Entity
@Table(name = "comments", indexes = @Index(name = "idx_comments_post", columnList = "post_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    /** Null for a top-level comment; otherwise the comment being replied to. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /** Comments can carry a sticker or photo, as they can in the real product. */
    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Column(name = "edited_at")
    private Instant editedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
