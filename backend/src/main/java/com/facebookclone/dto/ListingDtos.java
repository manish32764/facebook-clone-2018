package com.facebookclone.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public final class ListingDtos {

    private ListingDtos() {}

    public record CreateListingRequest(
            @NotBlank @Size(max = 160) String title,
            @Size(max = 4000) String description,
            @NotNull @DecimalMin("0.0") BigDecimal price,
            String currency,
            @NotBlank String category,
            String location,
            String imageUrl,
            String condition
    ) {}

    /** Every field optional: only the ones sent are changed. */
    public record UpdateListingRequest(
            @Size(max = 160) String title,
            @Size(max = 4000) String description,
            @DecimalMin("0.0") BigDecimal price,
            String category,
            String location,
            String imageUrl,
            String condition
    ) {}

    public record ListingDto(
            Long id,
            UserDto seller,
            String title,
            String description,
            BigDecimal price,
            String currency,
            String category,
            String location,
            String imageUrl,
            String condition,
            String status,
            boolean mine,
            Instant createdAt,
            boolean savedByMe
    ) {}

    /** Browse filters; every one optional. */
    public record ListingFilter(
            String category,
            String query,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String location,
            String condition,
            /** newest (default), price_asc, price_desc */
            String sort
    ) {}
}
