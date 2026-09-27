package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Directed row: requester -> addressee. An ACCEPTED row means both are friends. */
@Entity
@Table(name = "friendships",
       uniqueConstraints = @UniqueConstraint(name = "uk_friendship_pair", columnNames = {"requester_id", "addressee_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id")
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "addressee_id")
    private User addressee;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum Status { PENDING, ACCEPTED, DECLINED }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
