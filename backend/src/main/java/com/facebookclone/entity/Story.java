package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** A story lives for 24 hours; the queries filter on expiresAt rather than a job. */
@Entity
@Table(name = "stories", indexes = @Index(name = "idx_stories_author", columnList = "author_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String text;

    /** Used when there is no photo: a text card on a solid colour, like the app. */
    @Column(name = "background_color", length = 20)
    private String backgroundColor;

    /**
     * Text and sticker layers drawn over the photo, as a JSON array the client
     * owns: [{"kind":"text","value":"Hi","x":0.5,"y":0.3,"color":"#fff","size":28}].
     */
    @Column(columnDefinition = "TEXT")
    private String overlays;

    /** Who can see it. Null on older rows, which read as FRIENDS. */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Audience audience;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** PUBLIC reaches followers as well as friends. */
    public enum Audience { PUBLIC, FRIENDS, CLOSE_FRIENDS }

    public Audience audienceOrDefault() {
        return audience == null ? Audience.FRIENDS : audience;
    }

    @PrePersist
    void stampTimes() {
        if (createdAt == null) createdAt = Instant.now();
        if (expiresAt == null) expiresAt = createdAt.plus(24, ChronoUnit.HOURS);
    }
}
