package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** A member inviting a friend into a group. Accepting skips admin approval. */
@Entity
@Table(name = "group_invites",
       uniqueConstraints = @UniqueConstraint(name = "uk_group_invite", columnNames = {"group_id", "invitee_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id")
    private SocialGroup group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inviter_id")
    private User inviter;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invitee_id")
    private User invitee;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
