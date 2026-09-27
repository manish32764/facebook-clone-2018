package com.facebookclone.dto;

import com.facebookclone.entity.User;

import java.time.Instant;
import java.time.LocalDate;

public record UserDto(
        Long id,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String avatarUrl,
        String coverUrl,
        String bio,
        String hometown,
        String currentCity,
        String work,
        String education,
        String relationshipStatus,
        String phone,
        String website,
        String gender,
        LocalDate birthDate,
        Instant lastSeenAt,
        Instant createdAt
) {
    public static UserDto from(User u) {
        return new UserDto(
                u.getId(), u.getFirstName(), u.getLastName(), u.getFullName(), u.getEmail(),
                u.getAvatarUrl(), u.getCoverUrl(), u.getBio(), u.getHometown(), u.getCurrentCity(),
                u.getWork(), u.getEducation(), u.getRelationshipStatus(), u.getPhone(), u.getWebsite(),
                u.getGender(), u.getBirthDate(), u.getLastSeenAt(), u.getCreatedAt());
    }

    /** Trimmed projection used inside feeds, chat threads and friend lists. */
    public static UserDto summary(User u) {
        return new UserDto(u.getId(), u.getFirstName(), u.getLastName(), u.getFullName(),
                null, u.getAvatarUrl(), null, null, null, null, null, null, null, null, null,
                null, null, u.getLastSeenAt(), null);
    }
}
