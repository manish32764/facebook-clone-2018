package com.facebookclone.controller;

import com.facebookclone.dto.PostDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.PostService;
import com.facebookclone.service.SafetyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final SafetyService safetyService;

    /** mode=top (default) ranks the feed; mode=recent is strictly newest first. */
    @GetMapping
    public List<PostDto> feed(@CurrentUser AppUserPrincipal me,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "10") int size,
                              @RequestParam(defaultValue = "top") String mode) {
        return postService.feed(me.getId(), page, Math.min(size, 50), mode);
    }

    @GetMapping("/user/{userId}")
    public List<PostDto> timeline(@PathVariable Long userId,
                                  @CurrentUser AppUserPrincipal me,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "10") int size) {
        return postService.timeline(userId, me.getId(), page, Math.min(size, 50));
    }

    @GetMapping("/group/{groupId}")
    public List<PostDto> groupFeed(@PathVariable Long groupId,
                                   @CurrentUser AppUserPrincipal me,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "10") int size) {
        return postService.groupFeed(groupId, me.getId(), page, Math.min(size, 50));
    }

    @GetMapping("/group/{groupId}/pending")
    public List<PostDto> pendingInGroup(@PathVariable Long groupId, @CurrentUser AppUserPrincipal me) {
        return postService.pendingInGroup(groupId, me.getId());
    }

    @GetMapping("/page/{pageId}")
    public List<PostDto> pageFeed(@PathVariable Long pageId,
                                  @CurrentUser AppUserPrincipal me,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "10") int size) {
        return postService.pageFeed(pageId, me.getId(), page, Math.min(size, 50));
    }

    /** Watch: every post that carries a video. */
    @GetMapping("/videos")
    public List<PostDto> videos(@CurrentUser AppUserPrincipal me,
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "10") int size) {
        return postService.videos(me.getId(), page, Math.min(size, 50));
    }

    @GetMapping("/saved")
    public List<PostDto> saved(@CurrentUser AppUserPrincipal me,
                               @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "10") int size) {
        return postService.saved(me.getId(), page, Math.min(size, 50));
    }

    @GetMapping("/memories")
    public List<PostDto> memories(@CurrentUser AppUserPrincipal me) {
        return postService.memories(me.getId());
    }

    @GetMapping("/{postId}")
    public PostDto one(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        return postService.one(postId, me.getId());
    }

    @PostMapping
    public ResponseEntity<PostDto> create(@CurrentUser AppUserPrincipal me,
                                          @Valid @RequestBody CreatePostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.create(me.getId(), request));
    }

    @PatchMapping("/{postId}")
    public PostDto update(@PathVariable Long postId,
                          @CurrentUser AppUserPrincipal me,
                          @Valid @RequestBody UpdatePostRequest request) {
        return postService.update(postId, me.getId(), request);
    }

    @PostMapping("/{postId}/share")
    public ResponseEntity<PostDto> share(@PathVariable Long postId,
                                         @CurrentUser AppUserPrincipal me,
                                         @RequestBody(required = false) SharePostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.share(postId, me.getId(), request));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> delete(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        postService.delete(postId, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{postId}/pin")
    public PostDto togglePin(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        return postService.togglePin(postId, me.getId());
    }

    @PostMapping("/{postId}/approve")
    public PostDto approve(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        return postService.approve(postId, me.getId());
    }

    @PostMapping("/{postId}/decline")
    public ResponseEntity<Void> decline(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        postService.decline(postId, me.getId());
        return ResponseEntity.noContent().build();
    }

    /** Toggles "Hide post" for you. */
    @PostMapping("/{postId}/hide")
    public Map<String, Object> toggleHidden(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        return Map.of("postId", postId, "hidden", safetyService.toggleHidden(me.getId(), postId));
    }

    /**
     * Sets, switches or clears a reaction. An empty body means LIKE, so the plain
     * Like button needs no payload.
     */
    @PostMapping("/{postId}/react")
    public ReactionResponse react(@PathVariable Long postId,
                                  @CurrentUser AppUserPrincipal me,
                                  @RequestBody(required = false) Map<String, String> body) {
        return postService.react(postId, me.getId(), body == null ? null : body.get("reaction"));
    }

    /** Kept so the old like endpoint still works: it toggles a plain LIKE. */
    @PostMapping("/{postId}/like")
    public ReactionResponse like(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        return postService.react(postId, me.getId(), "LIKE");
    }

    @GetMapping("/{postId}/reactions")
    public List<ReactorDto> reactors(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        return postService.reactors(postId, me.getId());
    }

    @GetMapping("/{postId}/comments")
    public List<CommentDto> comments(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        return postService.comments(postId, me.getId());
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<CommentDto> addComment(@PathVariable Long postId,
                                                 @CurrentUser AppUserPrincipal me,
                                                 @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.addComment(postId, me.getId(), request));
    }

    @PatchMapping("/comments/{commentId}")
    public CommentDto editComment(@PathVariable Long commentId,
                                  @CurrentUser AppUserPrincipal me,
                                  @Valid @RequestBody UpdateCommentRequest request) {
        return postService.editComment(commentId, me.getId(), request.content());
    }

    @PostMapping("/comments/{commentId}/like")
    public CommentDto toggleCommentLike(@PathVariable Long commentId, @CurrentUser AppUserPrincipal me) {
        return postService.toggleCommentLike(commentId, me.getId());
    }

    @PostMapping("/comments/{commentId}/react")
    public CommentDto reactToComment(@PathVariable Long commentId,
                                     @CurrentUser AppUserPrincipal me,
                                     @RequestBody(required = false) Map<String, String> body) {
        return postService.reactToComment(commentId, me.getId(), body == null ? null : body.get("reaction"));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId, @CurrentUser AppUserPrincipal me) {
        postService.deleteComment(commentId, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{postId}/save")
    public Map<String, Object> toggleSave(@PathVariable Long postId, @CurrentUser AppUserPrincipal me) {
        boolean saved = postService.toggleSave(postId, me.getId());
        return Map.of("postId", postId, "saved", saved);
    }
}
