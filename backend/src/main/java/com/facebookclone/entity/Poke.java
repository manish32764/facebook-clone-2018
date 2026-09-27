package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** A poke from one person to another. Poking back flips who is waiting. */
@Entity
@Table(name = "pokes",
       uniqueConstraints = @UniqueConstraint(name = "uk_poke_pair", columnNames = {"poker_id", "poked_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Poke {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poker_id")
    private User poker;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poked_id")
    private User poked;

    @Column(name = "poke_count", nullable = false)
    @Builder.Default
    private int count = 1;

    /** True until the poked person pokes back or dismisses it. */
    @Column(nullable = false)
    @Builder.Default
    private boolean pending = true;

    @Column(name = "last_poked_at")
    private Instant lastPokedAt;
}
