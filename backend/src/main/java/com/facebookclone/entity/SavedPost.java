package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "saved_posts",
       uniqueConstraints = @UniqueConstraint(name = "uk_saved_post", columnNames = {"user_id", "post_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SavedPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
