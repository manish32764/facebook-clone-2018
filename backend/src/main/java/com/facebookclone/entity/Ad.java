package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/** A self-serve ad from Ads Manager, shown in the right rail and between feed posts. */
@Entity
@Table(name = "ads")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Ad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "advertiser_id")
    private User advertiser;

    /** Ads can run as a Page; the Page's name and picture are shown instead. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id")
    private FbPage page;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Column(name = "link_url", length = 512, nullable = false)
    private String linkUrl;

    /** LEARN_MORE, SHOP_NOW, SIGN_UP, BOOK_NOW or CONTACT_US */
    @Column(name = "call_to_action", length = 20, nullable = false)
    @Builder.Default
    private String callToAction = "LEARN_MORE";

    @Column(name = "daily_budget", precision = 12, scale = 2)
    private BigDecimal dailyBudget;

    @Column(nullable = false)
    @Builder.Default
    private long impressions = 0;

    @Column(nullable = false)
    @Builder.Default
    private long clicks = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
