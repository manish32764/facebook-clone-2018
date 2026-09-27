package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** One finished round of an instant game. Higher is always better. */
@Entity
@Table(name = "game_scores", indexes = @Index(name = "idx_game_scores_game", columnList = "game"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GameScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 30)
    private String game;

    @Column(nullable = false)
    private long score;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
