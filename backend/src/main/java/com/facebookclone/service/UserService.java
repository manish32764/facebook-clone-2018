package com.facebookclone.service;

import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.FriendshipRepository;
import com.facebookclone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.facebookclone.repository.BlockRepository blockRepository;

    @Transactional(readOnly = true)
    public User require(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }

    @Transactional(readOnly = true)
    public UserDto profile(Long id) {
        return UserDto.from(require(id));
    }

    @Transactional(readOnly = true)
    public List<UserDto> search(String query, Long selfId) {
        if (query == null || query.trim().length() < 2) return List.of();
        List<Long> hidden = blockRepository.findBlockedIds(selfId);
        List<Long> blockers = blockRepository.findBlockerIds(selfId);
        return userRepository.search(query.trim(), selfId).stream()
                .filter(u -> !hidden.contains(u.getId()) && !blockers.contains(u.getId()))
                .map(UserDto::summary).toList();
    }

    /** Friends whose birthday is today, for the reminder card in the right rail. */
    @Transactional(readOnly = true)
    public List<UserDto> birthdaysToday(Long userId) {
        List<Long> friendIds = friendshipRepository.findFriendIds(userId);
        if (friendIds.isEmpty()) return List.of();

        LocalDate today = LocalDate.now();
        return userRepository.findBirthdays(friendIds, today.getMonthValue(), today.getDayOfMonth())
                .stream().map(UserDto::summary).toList();
    }

    @Transactional
    public UserDto updateProfile(Long id, Map<String, String> updates) {
        User user = require(id);
        updates.forEach((field, value) -> {
            switch (field) {
                case "firstName"          -> { if (notBlank(value)) user.setFirstName(value.trim()); }
                case "lastName"           -> { if (notBlank(value)) user.setLastName(value.trim()); }
                case "bio"                -> user.setBio(value);
                case "hometown"           -> user.setHometown(value);
                case "currentCity"        -> user.setCurrentCity(value);
                case "work"               -> user.setWork(value);
                case "education"          -> user.setEducation(value);
                case "relationshipStatus" -> user.setRelationshipStatus(value);
                case "phone"              -> user.setPhone(value);
                case "website"            -> user.setWebsite(value);
                case "gender"             -> user.setGender(value);
                case "avatarUrl"          -> user.setAvatarUrl(value);
                case "coverUrl"           -> user.setCoverUrl(value);
                case "birthDate"          -> user.setBirthDate(parseDate(value));
                default                   -> { /* ignore unknown or non-editable fields */ }
            }
        });
        return UserDto.from(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = require(id);
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw ApiException.badRequest("Your current password is not right");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw ApiException.badRequest("Pick a password of at least 6 characters");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    /** A blank value clears the date rather than failing the whole patch. */
    private static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (RuntimeException ex) {
            throw ApiException.badRequest("Dates must look like 1990-05-14");
        }
    }
}
