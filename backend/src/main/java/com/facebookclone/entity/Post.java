package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "posts", indexes = {
        @Index(name = "idx_posts_author", columnList = "author_id"),
        @Index(name = "idx_posts_group", columnList = "group_id"),
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    /** A direct video link; a post with one shows up in Watch. */
    @Column(name = "video_url", length = 512)
    private String videoUrl;

    /** feeling / activity line, e.g. "feeling nostalgic" */
    @Column(length = 120)
    private String feeling;

    @Column(length = 120)
    private String location;

    /** The post this one re-shares, if any. Sharing a share re-points at the original. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_post_id")
    private Post sharedPost;

    /** Set when the post was published into a group rather than onto a timeline. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private SocialGroup group;

    /** "— with Sarah Connor and 2 others" */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "post_tags",
               joinColumns = @JoinColumn(name = "post_id"),
               inverseJoinColumns = @JoinColumn(name = "user_id"))
    @Builder.Default
    private Set<User> taggedUsers = new LinkedHashSet<>();

    /** Set when someone wrote on another person's timeline, e.g. a birthday wish. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wall_owner_id")
    private User wallOwner;

    /** Set when the post was published as a Page rather than as a person. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id")
    private FbPage page;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Privacy privacy = Privacy.PUBLIC;

    /**
     * The people a FRIENDS_EXCEPT post leaves out, or the only people a
     * SPECIFIC post is shown to. Unused for every other audience.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "post_audience",
               joinColumns = @JoinColumn(name = "post_id"),
               inverseJoinColumns = @JoinColumn(name = "user_id"))
    @Builder.Default
    private Set<User> audience = new LinkedHashSet<>();

    /** Pinned to the top of a timeline, group or Page. */
    @Column(columnDefinition = "boolean default false not null")
    @Builder.Default
    private boolean pinned = false;

    /** Waiting for a group admin to approve it; hidden from every feed until then. */
    @Column(columnDefinition = "boolean default false not null")
    @Builder.Default
    private boolean pending = false;

    @Column(name = "edited_at")
    private Instant editedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PostLike> likes = new ArrayList<>();

    public enum Privacy { PUBLIC, FRIENDS, FRIENDS_EXCEPT, SPECIFIC, CLOSE_FRIENDS, ONLY_ME }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
