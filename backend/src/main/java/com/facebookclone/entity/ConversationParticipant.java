package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** One person's membership of a thread, and how far they have read into it. */
@Entity
@Table(name = "conversation_participants",
       uniqueConstraints = @UniqueConstraint(name = "uk_participant_pair",
                                            columnNames = {"conversation_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConversationParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    /** Everything sent at or before this instant counts as seen. */
    @Column(name = "last_read_at")
    private Instant lastReadAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean muted = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean archived = false;

    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;

    @PrePersist
    void stampJoinedAt() {
        if (joinedAt == null) joinedAt = Instant.now();
    }
}
