package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A Facebook Group. Named SocialGroup rather than Group because GROUP is a
 * reserved word in both JPQL and SQL, and the table is fb_groups for the same
 * reason.
 */
@Entity
@Table(name = "fb_groups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SocialGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Privacy privacy = Privacy.PUBLIC;

    /** When on, posts from ordinary members wait for an admin before anyone sees them. */
    @Column(name = "post_approval", columnDefinition = "boolean default false not null")
    @Builder.Default
    private boolean postApproval = false;

    @Column(columnDefinition = "TEXT")
    private String rules;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /** PUBLIC groups are readable by anyone; PRIVATE ones only by members. */
    public enum Privacy { PUBLIC, PRIVATE }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
