package com.facebookclone.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Albums, fundraisers, games, jobs, dating and ads. */
public final class ExtrasDtos {

    private ExtrasDtos() {}

    // ----------------------------------------------------------------- albums ---

    public record AlbumRequest(@Size(max = 120) String title, @Size(max = 2000) String description,
                               List<String> photoUrls) {}

    public record AddPhotosRequest(List<String> photoUrls, @Size(max = 500) String caption) {}

    public record PhotoDto(Long id, Long albumId, String url, String caption, Instant createdAt) {}

    public record AlbumDto(Long id, UserDto owner, String title, String description, String coverUrl,
                           long photoCount, Instant createdAt, List<PhotoDto> photos) {}

    // ------------------------------------------------------------ fundraisers ---

    public record FundraiserRequest(
            @NotBlank @Size(max = 160) String title,
            @Size(max = 6000) String story,
            String coverUrl,
            @NotNull @DecimalMin("1.0") BigDecimal goal,
            @NotBlank String category,
            @Size(max = 140) String beneficiary,
            Instant endsAt
    ) {}

    public record FundraiserDto(
            Long id,
            UserDto creator,
            String title,
            String story,
            String coverUrl,
            BigDecimal goal,
            BigDecimal raised,
            String currency,
            String category,
            String beneficiary,
            Instant endsAt,
            boolean closed,
            long donationCount,
            boolean mine,
            Instant createdAt
    ) {}

    public record DonateRequest(@NotNull @DecimalMin("1.0") BigDecimal amount, @Size(max = 500) String message) {}

    public record DonationDto(Long id, UserDto donor, BigDecimal amount, String message, Instant createdAt) {}

    // ------------------------------------------------------------------ games ---

    public record GameDto(String key, String name, String description, String color,
                          long myBest, long myPlays, List<LeaderDto> leaders) {}

    public record LeaderDto(UserDto user, long score, int rank) {}

    public record ScoreRequest(long score) {}

    public record ScoreResultDto(long score, long best, boolean newBest, List<LeaderDto> leaders) {}

    // ------------------------------------------------------------------- jobs ---

    public record JobRequest(
            @NotBlank @Size(max = 140) String title,
            @NotBlank @Size(max = 140) String company,
            @Size(max = 140) String location,
            @NotBlank String employmentType,
            boolean remote,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            @Size(max = 8000) String description,
            Long pageId,
            Boolean open
    ) {}

    public record JobDto(
            Long id,
            UserDto poster,
            PageDtos.PageRefDto page,
            String title,
            String company,
            String location,
            String employmentType,
            boolean remote,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String currency,
            String description,
            boolean open,
            boolean mine,
            long applicantCount,
            /** Your application status, or null when you have not applied. */
            String myApplicationStatus,
            Instant createdAt
    ) {}

    public record ApplyRequest(@Size(max = 4000) String message, @Size(max = 160) String email,
                               @Size(max = 40) String phone, String resumeUrl) {}

    public record ApplicationDto(Long id, JobDto job, UserDto applicant, String message, String email,
                                 String phone, String resumeUrl, String status, Instant createdAt) {}

    public record StatusRequest(@NotBlank String status) {}

    // ----------------------------------------------------------------- dating ---

    public record DatingProfileRequest(
            @Size(max = 1000) String bio,
            String interestedIn,
            Integer minAge,
            Integer maxAge,
            @Size(max = 120) String city,
            List<String> photoUrls,
            Boolean active
    ) {}

    public record DatingProfileDto(
            UserDto user,
            String bio,
            String interestedIn,
            int minAge,
            int maxAge,
            String city,
            List<String> photoUrls,
            boolean active,
            Integer age,
            String work,
            String education
    ) {}

    public record SwipeRequest(boolean liked) {}

    public record SwipeResultDto(boolean matched, DatingProfileDto match) {}

    // -------------------------------------------------------------------- ads ---

    public record AdRequest(
            @NotBlank @Size(max = 120) String title,
            @Size(max = 1000) String body,
            String imageUrl,
            @NotBlank String linkUrl,
            String callToAction,
            BigDecimal dailyBudget,
            Long pageId,
            Boolean active
    ) {}

    public record AdDto(
            Long id,
            UserDto advertiser,
            PageDtos.PageRefDto page,
            String title,
            String body,
            String imageUrl,
            String linkUrl,
            String callToAction,
            BigDecimal dailyBudget,
            long impressions,
            long clicks,
            boolean active,
            boolean mine,
            Instant createdAt
    ) {}
}
