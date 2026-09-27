package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Drives the seen/unseen ring on the stories rail and the viewer count. */
@Entity
@Table(name = "story_views",
       uniqueConstraints = @UniqueConstraint(name = "uk_story_view", columnNames = {"story_id", "viewer_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StoryView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id")
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viewer_id")
    private User viewer;

    @Column(name = "viewed_at", updatable = false)
    private Instant viewedAt;

    @PrePersist
    void stampViewedAt() {
        if (viewedAt == null) viewedAt = Instant.now();
    }
}
