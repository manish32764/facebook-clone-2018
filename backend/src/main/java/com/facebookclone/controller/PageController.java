package com.facebookclone.controller;

import com.facebookclone.dto.PageDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.PageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;

    @GetMapping("/categories")
    public List<String> categories() {
        return PageService.CATEGORIES;
    }

    /** Pages you like or follow. */
    @GetMapping
    public List<PageDto> connected(@CurrentUser AppUserPrincipal me) {
        return pageService.connected(me.getId());
    }

    @GetMapping("/mine")
    public List<PageDto> owned(@CurrentUser AppUserPrincipal me) {
        return pageService.owned(me.getId());
    }

    @GetMapping("/discover")
    public List<PageDto> discover(@CurrentUser AppUserPrincipal me) {
        return pageService.discover(me.getId());
    }

    @GetMapping("/{id}")
    public PageDto one(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return pageService.one(id, me.getId());
    }

    @PostMapping
    public ResponseEntity<PageDto> create(@CurrentUser AppUserPrincipal me, @Valid @RequestBody PageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pageService.create(me.getId(), request));
    }

    @PutMapping("/{id}")
    public PageDto update(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                          @Valid @RequestBody PageRequest request) {
        return pageService.update(id, me.getId(), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        pageService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/like")
    public PageDto like(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return pageService.toggleLike(id, me.getId());
    }

    @PostMapping("/{id}/follow")
    public PageDto follow(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return pageService.toggleFollow(id, me.getId());
    }

    @GetMapping("/{id}/reviews")
    public List<ReviewDto> reviews(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return pageService.reviews(id, me.getId());
    }

    @PostMapping("/{id}/reviews")
    public ReviewDto review(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                            @Valid @RequestBody ReviewRequest request) {
        return pageService.review(id, me.getId(), request);
    }

    @DeleteMapping("/{id}/reviews")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        pageService.deleteReview(id, me.getId());
        return ResponseEntity.noContent().build();
    }
}
