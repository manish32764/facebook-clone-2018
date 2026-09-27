package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** A like or a pass. Two likes in opposite directions make a match. */
@Entity
@Table(name = "dating_swipes",
       uniqueConstraints = @UniqueConstraint(name = "uk_dating_swipe", columnNames = {"from_id", "to_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DatingSwipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_id")
    private User from;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_id")
    private User to;

    @Column(nullable = false)
    private boolean liked;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
