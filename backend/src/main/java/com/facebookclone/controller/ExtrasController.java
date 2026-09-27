package com.facebookclone.controller;

import com.facebookclone.dto.ExtrasDtos.*;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import com.facebookclone.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Albums, fundraisers, games, jobs, dating and ads - the smaller product areas. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExtrasController {

    private final AlbumService albumService;
    private final FundraiserService fundraiserService;
    private final GameService gameService;
    private final JobService jobService;
    private final DatingService datingService;
    private final AdService adService;

    // ----------------------------------------------------------------- albums ---

    @GetMapping("/albums/user/{userId}")
    public List<AlbumDto> albums(@PathVariable Long userId, @CurrentUser AppUserPrincipal me) {
        return albumService.albumsOf(userId, me.getId());
    }

    @GetMapping("/albums/{id}")
    public AlbumDto album(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return albumService.one(id, me.getId());
    }

    @PostMapping("/albums")
    public ResponseEntity<AlbumDto> createAlbum(@CurrentUser AppUserPrincipal me, @Valid @RequestBody AlbumRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(albumService.create(me.getId(), req));
    }

    @PatchMapping("/albums/{id}")
    public AlbumDto updateAlbum(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                @Valid @RequestBody AlbumRequest req) {
        return albumService.update(id, me.getId(), req);
    }

    @PostMapping("/albums/{id}/photos")
    public AlbumDto addPhotos(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                              @Valid @RequestBody AddPhotosRequest req) {
        return albumService.addPhotos(id, me.getId(), req);
    }

    @DeleteMapping("/albums/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable Long photoId, @CurrentUser AppUserPrincipal me) {
        albumService.deletePhoto(photoId, me.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/albums/{id}")
    public ResponseEntity<Void> deleteAlbum(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        albumService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------ fundraisers ---

    @GetMapping("/fundraisers/categories")
    public List<String> fundraiserCategories() {
        return FundraiserService.CATEGORIES;
    }

    @GetMapping("/fundraisers")
    public List<FundraiserDto> fundraisers(@CurrentUser AppUserPrincipal me) {
        return fundraiserService.all(me.getId());
    }

    @GetMapping("/fundraisers/mine")
    public List<FundraiserDto> myFundraisers(@CurrentUser AppUserPrincipal me) {
        return fundraiserService.mine(me.getId());
    }

    @GetMapping("/fundraisers/{id}")
    public FundraiserDto fundraiser(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return fundraiserService.one(id, me.getId());
    }

    @GetMapping("/fundraisers/{id}/donations")
    public List<DonationDto> donations(@PathVariable Long id) {
        return fundraiserService.donations(id);
    }

    @PostMapping("/fundraisers")
    public ResponseEntity<FundraiserDto> createFundraiser(@CurrentUser AppUserPrincipal me,
                                                          @Valid @RequestBody FundraiserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fundraiserService.create(me.getId(), req));
    }

    @PutMapping("/fundraisers/{id}")
    public FundraiserDto updateFundraiser(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                          @Valid @RequestBody FundraiserRequest req) {
        return fundraiserService.update(id, me.getId(), req);
    }

    @PostMapping("/fundraisers/{id}/close")
    public FundraiserDto closeFundraiser(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                         @RequestBody(required = false) Map<String, Boolean> body) {
        boolean closed = body == null || !Boolean.FALSE.equals(body.get("closed"));
        return fundraiserService.setClosed(id, me.getId(), closed);
    }

    @DeleteMapping("/fundraisers/{id}")
    public ResponseEntity<Void> deleteFundraiser(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        fundraiserService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/fundraisers/{id}/donate")
    public FundraiserDto donate(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                                @Valid @RequestBody DonateRequest req) {
        return fundraiserService.donate(id, me.getId(), req);
    }

    // ------------------------------------------------------------------ games ---

    @GetMapping("/games")
    public List<GameDto> games(@CurrentUser AppUserPrincipal me) {
        return gameService.catalog(me.getId());
    }

    @GetMapping("/games/{game}/leaderboard")
    public List<LeaderDto> leaderboard(@PathVariable String game, @CurrentUser AppUserPrincipal me) {
        return gameService.leaderboard(game, me.getId());
    }

    @PostMapping("/games/{game}/scores")
    public ScoreResultDto submitScore(@PathVariable String game, @CurrentUser AppUserPrincipal me,
                                      @RequestBody ScoreRequest req) {
        return gameService.submit(game, me.getId(), req.score());
    }

    // ------------------------------------------------------------------- jobs ---

    @GetMapping("/jobs/types")
    public List<String> jobTypes() {
        return JobService.TYPES;
    }

    @GetMapping("/jobs")
    public List<JobDto> jobs(@RequestParam(required = false) String q,
                             @RequestParam(required = false) String type,
                             @RequestParam(required = false) String location,
                             @RequestParam(required = false) Boolean remote,
                             @CurrentUser AppUserPrincipal me) {
        return jobService.browse(q, type, location, remote, me.getId());
    }

    @GetMapping("/jobs/mine")
    public List<JobDto> postedJobs(@CurrentUser AppUserPrincipal me) {
        return jobService.posted(me.getId());
    }

    @GetMapping("/jobs/applications")
    public List<ApplicationDto> myApplications(@CurrentUser AppUserPrincipal me) {
        return jobService.myApplications(me.getId());
    }

    @GetMapping("/jobs/{id}")
    public JobDto job(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return jobService.one(id, me.getId());
    }

    @PostMapping("/jobs")
    public ResponseEntity<JobDto> createJob(@CurrentUser AppUserPrincipal me, @Valid @RequestBody JobRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.create(me.getId(), req));
    }

    @PutMapping("/jobs/{id}")
    public JobDto updateJob(@PathVariable Long id, @CurrentUser AppUserPrincipal me, @Valid @RequestBody JobRequest req) {
        return jobService.update(id, me.getId(), req);
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        jobService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/jobs/{id}/apply")
    public JobDto apply(@PathVariable Long id, @CurrentUser AppUserPrincipal me, @Valid @RequestBody ApplyRequest req) {
        return jobService.applyTo(id, me.getId(), req);
    }

    @GetMapping("/jobs/{id}/applications")
    public List<ApplicationDto> applicants(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        return jobService.applicants(id, me.getId());
    }

    @PatchMapping("/jobs/applications/{applicationId}")
    public ApplicationDto setApplicationStatus(@PathVariable Long applicationId, @CurrentUser AppUserPrincipal me,
                                               @Valid @RequestBody StatusRequest req) {
        return jobService.setStatus(applicationId, me.getId(), req.status());
    }

    // ----------------------------------------------------------------- dating ---

    /** Your profile, or an empty body when you have not set one up. */
    @GetMapping("/dating/profile")
    public ResponseEntity<DatingProfileDto> datingProfile(@CurrentUser AppUserPrincipal me) {
        return datingService.myProfile(me.getId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/dating/profile")
    public DatingProfileDto saveDatingProfile(@CurrentUser AppUserPrincipal me,
                                              @Valid @RequestBody DatingProfileRequest req) {
        return datingService.save(me.getId(), req);
    }

    @GetMapping("/dating/suggestions")
    public List<DatingProfileDto> datingSuggestions(@CurrentUser AppUserPrincipal me) {
        return datingService.suggestions(me.getId());
    }

    @PostMapping("/dating/swipe/{userId}")
    public SwipeResultDto swipe(@PathVariable Long userId, @CurrentUser AppUserPrincipal me,
                                @RequestBody SwipeRequest req) {
        return datingService.swipe(me.getId(), userId, req.liked());
    }

    @GetMapping("/dating/matches")
    public List<DatingProfileDto> matches(@CurrentUser AppUserPrincipal me) {
        return datingService.matches(me.getId());
    }

    @GetMapping("/dating/likes")
    public Map<String, Long> likes(@CurrentUser AppUserPrincipal me) {
        return Map.of("count", datingService.likesReceived(me.getId()));
    }

    // -------------------------------------------------------------------- ads ---

    @GetMapping("/ads/serve")
    public List<AdDto> serveAds(@CurrentUser AppUserPrincipal me, @RequestParam(defaultValue = "2") int count) {
        return adService.serve(me.getId(), count);
    }

    @PostMapping("/ads/{id}/click")
    public Map<String, String> clickAd(@PathVariable Long id) {
        return Map.of("url", adService.click(id));
    }

    @GetMapping("/ads/mine")
    public List<AdDto> myAds(@CurrentUser AppUserPrincipal me) {
        return adService.mine(me.getId());
    }

    @PostMapping("/ads")
    public ResponseEntity<AdDto> createAd(@CurrentUser AppUserPrincipal me, @Valid @RequestBody AdRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adService.create(me.getId(), req));
    }

    @PutMapping("/ads/{id}")
    public AdDto updateAd(@PathVariable Long id, @CurrentUser AppUserPrincipal me, @Valid @RequestBody AdRequest req) {
        return adService.update(id, me.getId(), req);
    }

    @PostMapping("/ads/{id}/active")
    public AdDto setAdActive(@PathVariable Long id, @CurrentUser AppUserPrincipal me,
                             @RequestBody Map<String, Boolean> body) {
        return adService.setActive(id, me.getId(), Boolean.TRUE.equals(body.get("active")));
    }

    @DeleteMapping("/ads/{id}")
    public ResponseEntity<Void> deleteAd(@PathVariable Long id, @CurrentUser AppUserPrincipal me) {
        adService.delete(id, me.getId());
        return ResponseEntity.noContent().build();
    }
}
