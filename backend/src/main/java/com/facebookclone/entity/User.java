package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "users", indexes = @Index(name = "idx_users_email", columnList = "email", unique = true))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "first_name", nullable = false, length = 60)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 60)
    private String lastName;

    @Column(length = 20)
    private String gender;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Column(length = 255)
    private String bio;

    @Column(length = 120)
    private String hometown;

    @Column(length = 120)
    private String work;

    @Column(length = 120)
    private String education;

    @Column(name = "current_city", length = 120)
    private String currentCity;

    @Column(name = "relationship_status", length = 40)
    private String relationshipStatus;

    @Column(length = 40)
    private String phone;

    @Column(length = 200)
    private String website;

    /**
     * Stamped by the presence heartbeat. Anyone seen inside the last two minutes
     * counts as online, which is what lights the green dots in the contacts rail.
     */
    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Transient
    public String getFullName() {
        return firstName + " " + lastName;
    }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
