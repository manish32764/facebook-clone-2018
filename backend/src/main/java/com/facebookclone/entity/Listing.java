package com.facebookclone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/** A Marketplace item. Prices are stored as minor-unit-safe BigDecimal. */
@Entity
@Table(name = "listings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Listing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id")
    private User seller;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(length = 8, nullable = false)
    @Builder.Default
    private String currency = "USD";

    @Column(length = 40, nullable = false)
    private String category;

    @Column(length = 140)
    private String location;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Condition condition = Condition.USED_GOOD;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private Status status = Status.AVAILABLE;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum Condition { NEW, USED_LIKE_NEW, USED_GOOD, USED_FAIR }

    public enum Status { AVAILABLE, PENDING, SOLD }

    @PrePersist
    void stampCreatedAt() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
