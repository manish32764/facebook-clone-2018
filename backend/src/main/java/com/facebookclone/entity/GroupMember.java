package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "group_members",
       uniqueConstraints = @UniqueConstraint(name = "uk_group_member", columnNames = {"group_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id")
    private SocialGroup group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Role role = Role.MEMBER;

    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;

    public enum Role { ADMIN, MODERATOR, MEMBER }

    @PrePersist
    void stampJoinedAt() {
        if (joinedAt == null) joinedAt = Instant.now();
    }
}
