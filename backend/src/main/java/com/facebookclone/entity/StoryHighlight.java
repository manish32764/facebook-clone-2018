package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A named collection of stories kept on a profile after they expire. */
@Entity
@Table(name = "story_highlights")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StoryHighlight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false, length = 60)
    private String title;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "story_highlight_items",
               joinColumns = @JoinColumn(name = "highlight_id"),
               inverseJoinColumns = @JoinColumn(name = "story_id"))
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<Story> stories = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
