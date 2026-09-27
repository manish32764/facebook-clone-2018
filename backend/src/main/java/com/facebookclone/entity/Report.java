package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** "Find support or report": one person flagging a user, post, comment, message or other object. */
@Entity
@Table(name = "reports", indexes = @Index(name = "idx_reports_reporter", columnList = "reporter_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id")
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", length = 20, nullable = false)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** A short label for the support inbox, e.g. "Post by Sarah Connor". */
    @Column(name = "target_label", length = 200)
    private String targetLabel;

    @Column(length = 60, nullable = false)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Status status = Status.OPEN;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum TargetType { USER, POST, COMMENT, MESSAGE, PAGE, GROUP, LISTING, STORY }

    public enum Status { OPEN, REVIEWED, ACTION_TAKEN }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
