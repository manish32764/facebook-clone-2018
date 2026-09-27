package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Close Friends, Acquaintances, or a list you named yourself. Close Friends
 * doubles as a post and story audience; both built-in lists nudge feed ranking.
 */
@Entity
@Table(name = "friend_lists")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FriendList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Kind kind = Kind.CUSTOM;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "friend_list_members",
               joinColumns = @JoinColumn(name = "list_id"),
               inverseJoinColumns = @JoinColumn(name = "user_id"))
    @Builder.Default
    private Set<User> members = new LinkedHashSet<>();

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum Kind { CLOSE_FRIENDS, ACQUAINTANCES, CUSTOM }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
