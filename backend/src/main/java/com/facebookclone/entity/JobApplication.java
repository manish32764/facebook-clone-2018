package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "job_applications",
       uniqueConstraints = @UniqueConstraint(name = "uk_job_application", columnNames = {"job_id", "applicant_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id")
    private JobPosting job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "applicant_id")
    private User applicant;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(length = 160)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(name = "resume_url", length = 512)
    private String resumeUrl;

    /** SUBMITTED, REVIEWED, INTERVIEW, REJECTED or HIRED */
    @Column(length = 20, nullable = false)
    @Builder.Default
    private String status = "SUBMITTED";

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
