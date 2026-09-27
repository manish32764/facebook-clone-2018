package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * One line in the bell dropdown. The text is composed when the notification is
 * raised rather than at read time, so a later edit to a post cannot rewrite
 * history in someone else's list.
 */
@Entity
@Table(name = "notifications",
       indexes = @Index(name = "idx_notifications_recipient", columnList = "recipient_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    /** Null for system notifications such as a birthday reminder. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    private Type type;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    /** Where clicking the row should land, e.g. "/profile/4" or "/groups/2". */
    @Column(length = 255)
    private String link;

    /** Thumbnail for the row: a post photo, a group cover, an event cover. */
    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum Type {
        POST_REACTION, COMMENT, COMMENT_REPLY, COMMENT_REACTION, POST_SHARE, MENTION, TAG,
        FRIEND_REQUEST, FRIEND_ACCEPTED,
        GROUP_INVITE, GROUP_POST, EVENT_INVITE, EVENT_REMINDER,
        MESSAGE, BIRTHDAY, MEMORY, LISTING_INTEREST,
        WALL_POST, FOLLOW, POKE,
        GROUP_JOIN_REQUEST, GROUP_JOIN_APPROVED, GROUP_POST_PENDING, GROUP_POST_APPROVED, GROUP_ROLE,
        EVENT_UPDATED, PAGE_LIKE, PAGE_REVIEW, STORY_REACTION, STORY_REPLY,
        FUNDRAISER_DONATION, JOB_APPLICATION, JOB_APPLICATION_UPDATE, DATING_MATCH
    }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
