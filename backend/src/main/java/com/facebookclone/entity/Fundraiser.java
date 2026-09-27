package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "fundraisers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Fundraiser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id")
    private User creator;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String story;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal goal;

    @Column(length = 8, nullable = false)
    @Builder.Default
    private String currency = "USD";

    @Column(length = 60, nullable = false)
    private String category;

    /** Who the money is for, e.g. "Seattle Food Bank". */
    @Column(length = 140)
    private String beneficiary;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean closed = false;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
