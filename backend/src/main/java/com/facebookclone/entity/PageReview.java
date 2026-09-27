package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** "Do you recommend this Page?" - one recommendation per person per Page. */
@Entity
@Table(name = "page_reviews",
       uniqueConstraints = @UniqueConstraint(name = "uk_page_review", columnNames = {"page_id", "author_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "page_id")
    private FbPage page;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(nullable = false)
    private boolean recommends;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist @PreUpdate
    void stampCreatedAt() {
        createdAt = Instant.now();
    }
}
