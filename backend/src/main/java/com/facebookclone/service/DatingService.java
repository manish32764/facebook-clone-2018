package com.facebookclone.service;

import com.facebookclone.dto.ExtrasDtos.*;
import com.facebookclone.dto.MessageDtos.SendMessageRequest;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.DatingProfile;
import com.facebookclone.entity.DatingSwipe;
import com.facebookclone.entity.Notification;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.DatingProfileRepository;
import com.facebookclone.repository.DatingSwipeRepository;
import com.facebookclone.repository.FriendshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;

/**
 * Dating: an opt-in profile, suggestions that never include your friends, and a
 * match when two people like each other - which opens a Messenger thread.
 */
@Service
@RequiredArgsConstructor
public class DatingService {

    private final DatingProfileRepository profileRepository;
    private final DatingSwipeRepository swipeRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserService userService;
    private final ViewerScopeService scopeService;
    private final MessageService messageService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public Optional<DatingProfileDto> myProfile(Long userId) {
        return profileRepository.findByUserId(userId).map(DatingService::toDto);
    }

    @Transactional
    public DatingProfileDto save(Long userId, DatingProfileRequest req) {
        User user = userService.require(userId);
        if (user.getBirthDate() != null && age(user.getBirthDate()) < 18) {
            throw ApiException.forbidden("Dating is only for people aged 18 and over");
        }
        DatingProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> DatingProfile.builder().user(user).build());

        if (req.bio() != null) profile.setBio(req.bio().isBlank() ? null : req.bio().trim());
        if (req.interestedIn() != null) {
            String wanted = req.interestedIn().trim().toUpperCase();
            if (!Set.of("MEN", "WOMEN", "EVERYONE").contains(wanted)) throw ApiException.badRequest("Pick men, women or everyone");
            profile.setInterestedIn(wanted);
        }
        if (req.minAge() != null) profile.setMinAge(Math.max(18, req.minAge()));
        if (req.maxAge() != null) profile.setMaxAge(Math.min(99, req.maxAge()));
        if (profile.getMinAge() > profile.getMaxAge()) throw ApiException.badRequest("The age range is back to front");
        if (req.city() != null) profile.setCity(req.city().isBlank() ? null : req.city().trim());
        if (req.photoUrls() != null) {
            profile.setPhotoUrls(String.join("\n", req.photoUrls().stream()
                    .filter(u -> u != null && !u.isBlank()).map(String::trim).toList()));
        }
        if (req.active() != null) profile.setActive(req.active());
        return toDto(profileRepository.save(profile));
    }

    /** People to swipe on: active, not friends, not seen before, and a mutual fit. */
    @Transactional(readOnly = true)
    public List<DatingProfileDto> suggestions(Long userId) {
        DatingProfile me = profileRepository.findByUserId(userId)
                .filter(DatingProfile::isActive)
                .orElseThrow(() -> ApiException.badRequest("Set up your Dating profile first"));

        Set<Long> skip = new HashSet<>(friendshipRepository.findFriendIds(userId));
        skip.addAll(swipeRepository.findSwipedIds(userId));
        skip.addAll(scopeService.hiddenIds(userId));
        skip.add(userId);

        return profileRepository.findActive().stream()
                .filter(p -> !skip.contains(p.getUser().getId()))
                .filter(p -> fits(me, p) && fits(p, me))
                .limit(20)
                .map(DatingService::toDto)
                .toList();
    }

    @Transactional
    public SwipeResultDto swipe(Long userId, Long targetId, boolean liked) {
        if (Objects.equals(userId, targetId)) throw ApiException.badRequest("That's you");
        DatingProfile target = profileRepository.findByUserId(targetId)
                .filter(DatingProfile::isActive)
                .orElseThrow(() -> ApiException.notFound("Dating profile"));
        User me = userService.require(userId);

        DatingSwipe swipe = swipeRepository.findByFromIdAndToId(userId, targetId)
                .orElseGet(() -> DatingSwipe.builder().from(me).to(target.getUser()).build());
        swipe.setLiked(liked);
        swipeRepository.save(swipe);

        boolean matched = liked && swipeRepository.findByFromIdAndToId(targetId, userId)
                .map(DatingSwipe::isLiked).orElse(false);
        if (matched) {
            Long conversationId = messageService.openDirect(userId, targetId).id();
            messageService.send(conversationId, userId, new SendMessageRequest(
                    "💘 You matched on Dating! Say hi.", null, "TEXT"));
            notificationService.raise(target.getUser(), me, Notification.Type.DATING_MATCH,
                    "You have a new match on Dating: " + me.getFirstName() + ".", "/dating", me.getAvatarUrl());
            notificationService.raise(me, target.getUser(), Notification.Type.DATING_MATCH,
                    "You have a new match on Dating: " + target.getUser().getFirstName() + ".", "/dating",
                    target.getUser().getAvatarUrl());
        }
        return new SwipeResultDto(matched, matched ? toDto(target) : null);
    }

    @Transactional(readOnly = true)
    public List<DatingProfileDto> matches(Long userId) {
        List<Long> ids = swipeRepository.findMatchIds(userId);
        if (ids.isEmpty()) return List.of();
        return profileRepository.findForUsers(ids).stream().map(DatingService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public long likesReceived(Long userId) {
        return swipeRepository.countByToIdAndLikedTrue(userId);
    }

    /** Does `candidate` fall inside what `seeker` is looking for? */
    private static boolean fits(DatingProfile seeker, DatingProfile candidate) {
        String gender = candidate.getUser().getGender() == null ? "" : candidate.getUser().getGender().toLowerCase();
        boolean genderOk = switch (seeker.getInterestedIn()) {
            case "MEN" -> gender.equals("male");
            case "WOMEN" -> gender.equals("female");
            default -> true;
        };
        LocalDate birth = candidate.getUser().getBirthDate();
        boolean ageOk = birth == null
                || (age(birth) >= seeker.getMinAge() && age(birth) <= seeker.getMaxAge());
        return genderOk && ageOk;
    }

    private static int age(LocalDate birth) {
        return Period.between(birth, LocalDate.now()).getYears();
    }

    private static DatingProfileDto toDto(DatingProfile p) {
        User u = p.getUser();
        List<String> photos = new ArrayList<>();
        if (p.getPhotoUrls() != null && !p.getPhotoUrls().isBlank()) {
            photos.addAll(Arrays.stream(p.getPhotoUrls().split("\n")).filter(s -> !s.isBlank()).toList());
        }
        if (photos.isEmpty() && u.getAvatarUrl() != null) photos.add(u.getAvatarUrl());
        return new DatingProfileDto(
                UserDto.summary(u),
                p.getBio(),
                p.getInterestedIn(),
                p.getMinAge(),
                p.getMaxAge(),
                p.getCity() != null ? p.getCity() : u.getCurrentCity(),
                photos,
                p.isActive(),
                u.getBirthDate() == null ? null : age(u.getBirthDate()),
                u.getWork(),
                u.getEducation());
    }
}
