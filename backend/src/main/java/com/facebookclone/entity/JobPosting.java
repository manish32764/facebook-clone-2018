package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "job_postings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poster_id")
    private User poster;

    /** Set when the job is posted on behalf of a Page. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id")
    private FbPage page;

    @Column(nullable = false, length = 140)
    private String title;

    @Column(nullable = false, length = 140)
    private String company;

    @Column(length = 140)
    private String location;

    /** FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP or VOLUNTEER */
    @Column(name = "employment_type", length = 20, nullable = false)
    private String employmentType;

    @Column(nullable = false)
    @Builder.Default
    private boolean remote = false;

    @Column(name = "salary_min", precision = 12, scale = 2)
    private BigDecimal salaryMin;

    @Column(name = "salary_max", precision = 12, scale = 2)
    private BigDecimal salaryMax;

    @Column(length = 8, nullable = false)
    @Builder.Default
    private String currency = "USD";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_open", nullable = false)
    @Builder.Default
    private boolean open = true;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
