package com.facebookclone.service;

import com.facebookclone.dto.SocialDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Blocking, reporting and hiding posts. */
@Service
@RequiredArgsConstructor
public class SafetyService {

    private final BlockRepository blockRepository;
    private final ReportRepository reportRepository;
    private final HiddenPostRepository hiddenPostRepository;
    private final FriendshipRepository friendshipRepository;
    private final FollowRepository followRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final MessageRepository messageRepository;
    private final FbPageRepository pageRepository;
    private final SocialGroupRepository groupRepository;
    private final ListingRepository listingRepository;
    private final StoryRepository storyRepository;
    private final UserService userService;

    // ---------------------------------------------------------------- blocking ---

    /** Blocking also ends any friendship, pending request or follow between the two. */
    @Transactional
    public void block(Long userId, Long targetId) {
        if (Objects.equals(userId, targetId)) {
            throw ApiException.badRequest("You cannot block yourself");
        }
        User target = userService.require(targetId);
        if (blockRepository.existsByBlockerIdAndBlockedId(userId, targetId)) return;

        friendshipRepository.findBetween(userId, targetId).ifPresent(friendshipRepository::delete);
        followRepository.deleteBetween(userId, targetId);
        blockRepository.save(Block.builder().blocker(userService.require(userId)).blocked(target).build());
    }

    @Transactional
    public void unblock(Long userId, Long targetId) {
        blockRepository.findByBlockerIdAndBlockedId(userId, targetId).ifPresent(blockRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<BlockedDto> blocked(Long userId) {
        return blockRepository.findByBlocker(userId).stream()
                .map(b -> new BlockedDto(UserDto.summary(b.getBlocked()), b.getCreatedAt()))
                .toList();
    }

    // --------------------------------------------------------------- reporting ---

    @Transactional
    public ReportDto report(Long userId, ReportRequest req) {
        Report.TargetType type;
        try {
            type = Report.TargetType.valueOf(req.targetType().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown report type");
        }
        if (req.targetId() == null) throw ApiException.badRequest("Say what you are reporting");

        String label = label(type, req.targetId())
                .orElseThrow(() -> ApiException.notFound("The thing you reported"));

        Report saved = reportRepository.save(Report.builder()
                .reporter(userService.require(userId))
                .targetType(type)
                .targetId(req.targetId())
                .targetLabel(label)
                .reason(req.reason().trim())
                .details(req.details() == null || req.details().isBlank() ? null : req.details().trim())
                .build());
        return toDto(saved);
    }

    /** Your support inbox: every report you filed, newest first. */
    @Transactional(readOnly = true)
    public List<ReportDto> myReports(Long userId) {
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(userId).stream()
                .map(SafetyService::toDto).toList();
    }

    // ------------------------------------------------------------------ hiding ---

    /** Toggles "Hide post"; returns true when the post is hidden afterwards. */
    @Transactional
    public boolean toggleHidden(Long userId, Long postId) {
        Optional<HiddenPost> existing = hiddenPostRepository.findByUserIdAndPostId(userId, postId);
        if (existing.isPresent()) {
            hiddenPostRepository.delete(existing.get());
            return false;
        }
        Post post = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("Post"));
        hiddenPostRepository.save(HiddenPost.builder().user(userService.require(userId)).post(post).build());
        return true;
    }

    private Optional<String> label(Report.TargetType type, Long id) {
        return switch (type) {
            case USER -> Optional.of(userService.require(id).getFullName());
            case POST -> postRepository.findById(id).map(p -> "Post by " + p.getAuthor().getFullName());
            case COMMENT -> commentRepository.findById(id).map(c -> "Comment by " + c.getAuthor().getFullName());
            case MESSAGE -> messageRepository.findById(id).map(m -> "Message from " + m.getSender().getFullName());
            case PAGE -> pageRepository.findById(id).map(p -> "Page: " + p.getName());
            case GROUP -> groupRepository.findById(id).map(g -> "Group: " + g.getName());
            case LISTING -> listingRepository.findById(id).map(l -> "Listing: " + l.getTitle());
            case STORY -> storyRepository.findById(id).map(s -> "Story by " + s.getAuthor().getFullName());
        };
    }

    private static ReportDto toDto(Report r) {
        return new ReportDto(r.getId(), r.getTargetType().name(), r.getTargetId(), r.getTargetLabel(),
                r.getReason(), r.getDetails(), r.getStatus().name(), r.getCreatedAt());
    }
}
