package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "event_attendees",
       uniqueConstraints = @UniqueConstraint(name = "uk_event_attendee", columnNames = {"event_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Status status = Status.INTERESTED;

    @Column(name = "responded_at")
    private Instant respondedAt;

    public enum Status { GOING, INTERESTED, NOT_GOING }

    @PrePersist @PreUpdate
    void stampRespondedAt() {
        respondedAt = Instant.now();
    }
}
