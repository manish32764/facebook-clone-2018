package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** An opt-in Dating profile. Friends are never suggested to each other. */
@Entity
@Table(name = "dating_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DatingProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(columnDefinition = "TEXT")
    private String bio;

    /** MEN, WOMEN or EVERYONE */
    @Column(name = "interested_in", length = 20, nullable = false)
    @Builder.Default
    private String interestedIn = "EVERYONE";

    @Column(name = "min_age", nullable = false)
    @Builder.Default
    private int minAge = 18;

    @Column(name = "max_age", nullable = false)
    @Builder.Default
    private int maxAge = 60;

    @Column(length = 120)
    private String city;

    /** Newline-separated photo links; the first one is the card photo. */
    @Column(name = "photo_urls", columnDefinition = "TEXT")
    private String photoUrls;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
