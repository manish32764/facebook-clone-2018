package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A Messenger thread. DIRECT threads hold exactly two participants and are
 * looked up by that pair; GROUP threads carry their own name and picture.
 */
@Entity
@Table(name = "conversations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Type type = Type.DIRECT;

    /** Group threads only; a direct thread is titled after the other person. */
    @Column(length = 120)
    private String name;

    @Column(name = "picture_url", length = 512)
    private String pictureUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /** Kept in step on every send so the thread list can order without a join. */
    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ConversationParticipant> participants = new ArrayList<>();

    public enum Type { DIRECT, GROUP }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
        if (lastMessageAt == null) lastMessageAt = createdAt;
    }
}
