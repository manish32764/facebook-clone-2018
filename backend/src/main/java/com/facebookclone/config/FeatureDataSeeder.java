package com.facebookclone.config;

import com.facebookclone.entity.*;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Demo content for the second wave of features: Pages, follows, friend lists,
 * pokes, wall posts, albums, highlights, a private group with a waiting
 * request, fundraisers, jobs, Dating, ads and game scores.
 *
 * Runs after the other two seeders and guards each section on its own table,
 * so it also fills in an existing database without touching what is there.
 * Four extra people are created who are nobody's friend, so Follow and Dating
 * have someone to show. Their password is "password123" like everyone else.
 */
@Component
@Profile("!test")
@Order(3)
@RequiredArgsConstructor
@Slf4j
public class FeatureDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final FbPageRepository pageRepository;
    private final PageFollowRepository pageFollowRepository;
    private final PageReviewRepository pageReviewRepository;
    private final FollowRepository followRepository;
    private final FriendListRepository friendListRepository;
    private final PokeRepository pokeRepository;
    private final AlbumRepository albumRepository;
    private final PhotoRepository photoRepository;
    private final StoryRepository storyRepository;
    private final StoryHighlightRepository highlightRepository;
    private final SocialGroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupJoinRequestRepository joinRequestRepository;
    private final FundraiserRepository fundraiserRepository;
    private final DonationRepository donationRepository;
    private final JobPostingRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final DatingProfileRepository datingProfileRepository;
    private final DatingSwipeRepository datingSwipeRepository;
    private final AdRepository adRepository;
    private final GameScoreRepository gameScoreRepository;
    private final PasswordEncoder passwordEncoder;

    private final Map<String, User> people = new HashMap<>();

    @Override
    @Transactional
    public void run(String... args) {
        for (User user : userRepository.findAll()) {
            people.put(user.getEmail().split("@")[0], user);
        }
        if (!people.containsKey("mark")) {
            log.info("Demo accounts are absent - skipping the feature seed");
            return;
        }

        seedNewPeople();
        Map<String, FbPage> pages = pageRepository.count() == 0 ? seedPages() : Map.of();
        if (followRepository.count() == 0) seedFollows();
        if (friendListRepository.count() == 0) seedFriendLists();
        if (pokeRepository.count() == 0) seedPokes();
        if (albumRepository.count() == 0) seedAlbums();
        if (highlightRepository.count() == 0) seedHighlights();
        if (joinRequestRepository.count() == 0) seedPrivateGroup();
        if (fundraiserRepository.count() == 0) seedFundraisers();
        if (jobRepository.count() == 0) seedJobs(pages);
        if (datingProfileRepository.count() == 0) seedDating();
        if (adRepository.count() == 0) seedAds(pages);
        if (gameScoreRepository.count() == 0) seedScores();
        seedWallPostOnce();

        log.info("Feature seed complete: pages, follows, lists, albums, fundraisers, jobs, dating and ads");
    }

    // ---------------------------------------------------------------- people ---

    private void seedNewPeople() {
        person("lena", "Lena", "Fischer", "Travel writer. Currently somewhere with bad wifi.",
                "Berlin, Germany", "Writer at Wanderlust Weekly", "female", LocalDate.of(1993, 4, 21));
        person("diego", "Diego", "Alvarez", "Chef by day, DJ by night, sleeper never.",
                "Mexico City", "Head Chef at Casa Verde", "male", LocalDate.of(1990, 9, 3));
        person("aiko", "Aiko", "Tanaka", "Illustrator. Cats, coffee and pixel art.",
                "Osaka, Japan", "Illustrator at Studio Kumo", "female", LocalDate.of(1995, 12, 11));
        person("noah", "Noah", "Williams", "Marathoner and mediocre guitarist.",
                "Chicago, IL", "Physiotherapist", "male", LocalDate.of(1988, 6, 30));
    }

    private void person(String key, String first, String last, String bio, String city, String work,
                        String gender, LocalDate birth) {
        if (people.containsKey(key)) return;
        User user = userRepository.save(User.builder()
                .email(key + "@facebook.dev")
                .password(passwordEncoder.encode("password123"))
                .firstName(first).lastName(last).bio(bio)
                .currentCity(city).hometown(city).work(work)
                .gender(gender).birthDate(birth)
                .avatarUrl("https://picsum.photos/seed/" + key + "-face/300/300")
                .coverUrl("https://picsum.photos/seed/" + key + "cover/851/315")
                .build());
        people.put(key, user);
        post(user, "Hello Facebook! Public posts from me show up for anyone who follows along.",
                "https://picsum.photos/seed/" + key + "hello/1000/600", 30);
    }

    // ------------------------------------------------------------------ pages ---

    private Map<String, FbPage> seedPages() {
        FbPage coffee = page("Morning Ritual Coffee", "Restaurant", who("sarah"),
                "Small-batch roaster and neighbourhood cafe. Pour-overs, pastries and very strong opinions about grind size.",
                "coffee", "https://morningritual.example", "+1 213 555 0144", "Los Angeles, CA");
        FbPage outfitters = page("Trailhead Outfitters", "Local Business", who("alex"),
                "Gear rental and guided hikes around the Cascades. Rent a bear canister, not a regret.",
                "outfitters", "https://trailhead.example", "+1 206 555 0199", "Seattle, WA");
        FbPage film = page("Film Is Not Dead Club", "Community", who("maya"),
                "Monthly photo walks and darkroom nights for anyone still shooting film.",
                "filmclub", "https://filmclub.example", null, "London, UK");
        FbPage diego = page("Casa Verde Kitchen", "Restaurant", who("diego"),
                "Seasonal Mexican cooking. Tuesday is taco night and we are not taking questions.",
                "casaverde", "https://casaverde.example", "+52 55 5555 0101", "Mexico City");

        pagePost(coffee, "New single origin from Huila just landed. Notes of red apple and brown sugar.",
                "https://picsum.photos/seed/pagecoffee1/1000/600", 5);
        pagePost(coffee, "We are closed Monday for a roaster service. See you Tuesday!", null, 30);
        pagePost(outfitters, "Guided sunrise hike up Mount Si this Saturday. Six spots left.",
                "https://picsum.photos/seed/pagehike/1000/600", 8);
        pagePost(film, "Next darkroom night: bring two rolls of HP5 and your patience.",
                "https://picsum.photos/seed/pagefilm/1000/600", 12);
        pagePost(diego, "Taco Tuesday menu: al pastor, rajas con crema, and a mole we will not explain.",
                "https://picsum.photos/seed/pagetaco/1000/600", 3);

        like(coffee, "mark", "john", "priya");
        like(outfitters, "mark", "sarah", "maya");
        like(film, "priya", "john", "mark");
        like(diego, "lena", "aiko");

        review(coffee, "mark", true, "Best flat white in LA, and they remember your name.");
        review(coffee, "john", true, "The cold brew is dangerous.");
        review(outfitters, "sarah", true, "Alex's guided hike was the highlight of my month.");
        review(film, "john", false, "Great people, but the darkroom smells like vinegar.");

        return Map.of("coffee", coffee, "outfitters", outfitters, "film", film, "diego", diego);
    }

    private FbPage page(String name, String category, User owner, String description, String seed,
                        String website, String phone, String location) {
        FbPage page = pageRepository.save(FbPage.builder()
                .name(name).category(category).owner(owner).description(description)
                .avatarUrl("https://picsum.photos/seed/" + seed + "logo/300/300")
                .coverUrl("https://picsum.photos/seed/" + seed + "cover/1200/400")
                .website(website).phone(phone).location(location)
                .build());
        pageFollowRepository.save(PageFollow.builder().page(page).user(owner).liked(true).following(true).build());
        return page;
    }

    private void pagePost(FbPage page, String content, String imageUrl, int hoursAgo) {
        Post post = Post.builder().author(page.getOwner()).page(page).content(content).imageUrl(imageUrl)
                .privacy(Post.Privacy.PUBLIC).build();
        post.setCreatedAt(Instant.now().minus(hoursAgo, ChronoUnit.HOURS));
        postRepository.save(post);
    }

    private void like(FbPage page, String... keys) {
        for (String key : keys) {
            pageFollowRepository.save(PageFollow.builder().page(page).user(who(key)).liked(true).following(true).build());
        }
    }

    private void review(FbPage page, String key, boolean recommends, String content) {
        pageReviewRepository.save(PageReview.builder()
                .page(page).author(who(key)).recommends(recommends).content(content).build());
    }

    // ---------------------------------------------------- follows, lists, pokes ---

    private void seedFollows() {
        follow("mark", "lena");
        follow("mark", "diego");
        follow("priya", "aiko");
        follow("john", "noah");
        follow("lena", "mark");
        follow("aiko", "mark");
        follow("noah", "mark");
    }

    private void follow(String follower, String followee) {
        followRepository.save(Follow.builder().follower(who(follower)).followee(who(followee)).build());
    }

    private void seedFriendLists() {
        FriendList close = friendListRepository.save(FriendList.builder()
                .owner(who("mark")).name("Close Friends").kind(FriendList.Kind.CLOSE_FRIENDS).build());
        close.getMembers().add(who("priya"));
        close.getMembers().add(who("sarah"));
        friendListRepository.save(close);

        FriendList acquaintances = friendListRepository.save(FriendList.builder()
                .owner(who("mark")).name("Acquaintances").kind(FriendList.Kind.ACQUAINTANCES).build());
        acquaintances.getMembers().add(who("john"));
        friendListRepository.save(acquaintances);

        FriendList hiking = friendListRepository.save(FriendList.builder()
                .owner(who("mark")).name("Hiking Crew").kind(FriendList.Kind.CUSTOM).build());
        hiking.getMembers().add(who("alex"));
        hiking.getMembers().add(who("sarah"));
        friendListRepository.save(hiking);

        // One Close Friends post, so the audience shows up in the feed.
        Post post = Post.builder().author(who("priya"))
                .content("Close friends only: I got the job! Telling everyone else on Monday.")
                .privacy(Post.Privacy.CLOSE_FRIENDS).build();
        FriendList priyaClose = friendListRepository.save(FriendList.builder()
                .owner(who("priya")).name("Close Friends").kind(FriendList.Kind.CLOSE_FRIENDS).build());
        priyaClose.getMembers().add(who("mark"));
        friendListRepository.save(priyaClose);
        post.setCreatedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        postRepository.save(post);
    }

    private void seedPokes() {
        pokeRepository.save(Poke.builder().poker(who("john")).poked(who("mark")).count(3).pending(true)
                .lastPokedAt(Instant.now().minus(40, ChronoUnit.MINUTES)).build());
        pokeRepository.save(Poke.builder().poker(who("sarah")).poked(who("mark")).count(1).pending(true)
                .lastPokedAt(Instant.now().minus(5, ChronoUnit.HOURS)).build());
    }

    // ---------------------------------------------------- albums and highlights ---

    private void seedAlbums() {
        album(who("mark"), "Summer Road Trip", "Twelve states, one car, zero working air conditioning.",
                "roadtrip", 6);
        album(who("mark"), "Office Life", "Whiteboards and snacks.", "office", 4);
        album(who("priya"), "Goa 2018", "Beaches, fish curry and a very sunburnt engineer.", "goa", 5);
        album(who("maya"), "Portra 400 - Autumn", "Scans from the last three rolls.", "portra", 6);
    }

    private void album(User owner, String title, String description, String seed, int count) {
        Album album = albumRepository.save(Album.builder().owner(owner).title(title).description(description).build());
        for (int i = 1; i <= count; i++) {
            photoRepository.save(Photo.builder().album(album).owner(owner)
                    .url("https://picsum.photos/seed/" + seed + i + "/1000/750").build());
        }
    }

    /** Mark gets a "Launch Week" highlight; older stories are made for it if he has none. */
    private void seedHighlights() {
        List<Story> stories = storyRepository.findArchive(who("mark").getId());
        if (stories.isEmpty()) {
            stories = List.of(
                    oldStory("https://picsum.photos/seed/launch1/600/1000", "Day one. Coffee count: 4", 40),
                    oldStory(null, "We shipped it!", 39),
                    oldStory("https://picsum.photos/seed/launch3/600/1000", "Team dinner", 38));
        }
        StoryHighlight highlight = StoryHighlight.builder().owner(who("mark")).title("Launch Week").build();
        highlight.getStories().addAll(stories);
        highlightRepository.save(highlight);
    }

    /** An expired story from some days ago, kept alive only through the highlight. */
    private Story oldStory(String imageUrl, String text, int daysAgo) {
        Instant created = Instant.now().minus(daysAgo, ChronoUnit.DAYS);
        return storyRepository.save(Story.builder()
                .author(who("mark")).imageUrl(imageUrl).text(text).backgroundColor("#4267b2")
                .audience(Story.Audience.FRIENDS)
                .createdAt(created).expiresAt(created.plus(24, ChronoUnit.HOURS))
                .build());
    }

    // ---------------------------------------------------------------- groups ---

    /** A private group Mark admins, with a request waiting for him. */
    private void seedPrivateGroup() {
        SocialGroup group = groupRepository.save(SocialGroup.builder()
                .name("Founders Book Club")
                .description("One book a month, one very long argument about it.")
                .coverUrl("https://picsum.photos/seed/bookclub/1200/400")
                .privacy(SocialGroup.Privacy.PRIVATE)
                .postApproval(true)
                .rules("1. Finish the book.\n2. No spoilers in titles.\n3. Be kind, argue about ideas.")
                .createdBy(who("mark"))
                .build());
        groupMemberRepository.save(GroupMember.builder().group(group).user(who("mark")).role(GroupMember.Role.ADMIN).build());
        groupMemberRepository.save(GroupMember.builder().group(group).user(who("priya")).role(GroupMember.Role.MODERATOR).build());
        groupMemberRepository.save(GroupMember.builder().group(group).user(who("sarah")).role(GroupMember.Role.MEMBER).build());

        Post published = Post.builder().author(who("mark")).group(group).privacy(Post.Privacy.PUBLIC)
                .content("This month: 'The Mythical Man-Month'. Yes, again.").pinned(true).build();
        published.setCreatedAt(Instant.now().minus(3, ChronoUnit.DAYS));
        postRepository.save(published);

        Post waiting = Post.builder().author(who("sarah")).group(group).privacy(Post.Privacy.PUBLIC)
                .content("Can we do something with fewer diagrams next month?").pending(true).build();
        waiting.setCreatedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        postRepository.save(waiting);

        joinRequestRepository.save(GroupJoinRequest.builder().group(group).user(who("john"))
                .answer("I have read at least half of every book I own.").build());
    }

    // ----------------------------------------------------------- fundraisers ---

    private void seedFundraisers() {
        Fundraiser trail = fundraiserRepository.save(Fundraiser.builder()
                .creator(who("alex")).title("Rebuild the Twin Falls trail bridge")
                .story("Last winter's storm took out the footbridge on the Twin Falls trail. The trail association "
                        + "needs lumber, a permit and a lot of volunteer weekends. Every dollar goes to materials.")
                .coverUrl("https://picsum.photos/seed/fundbridge/1200/500")
                .goal(new BigDecimal("5000")).category("Environment").beneficiary("Cascade Trails Association")
                .endsAt(Instant.now().plus(30, ChronoUnit.DAYS)).build());
        donate(trail, "mark", "250", "For the goats.");
        donate(trail, "sarah", "50", null);
        donate(trail, "maya", "75", "Can't wait to photograph the new bridge.");

        Fundraiser birthday = fundraiserRepository.save(Fundraiser.builder()
                .creator(who("priya")).title("Priya's birthday fundraiser for girls' coding clubs")
                .story("Instead of gifts this year, help fund laptops for after-school coding clubs in Mumbai.")
                .coverUrl("https://picsum.photos/seed/fundcode/1200/500")
                .goal(new BigDecimal("1500")).category("Education").beneficiary("Code for Mumbai")
                .endsAt(Instant.now().plus(12, ChronoUnit.DAYS)).build());
        donate(birthday, "mark", "100", "Happy birthday, Priya!");
        donate(birthday, "john", "25", null);
    }

    private void donate(Fundraiser f, String key, String amount, String message) {
        donationRepository.save(Donation.builder().fundraiser(f).donor(who(key))
                .amount(new BigDecimal(amount)).message(message).build());
    }

    // ------------------------------------------------------------------ jobs ---

    private void seedJobs(Map<String, FbPage> pages) {
        JobPosting barista = jobRepository.save(JobPosting.builder()
                .poster(who("sarah")).page(pages.get("coffee"))
                .title("Barista (weekends)").company("Morning Ritual Coffee").location("Los Angeles, CA")
                .employmentType("PART_TIME").salaryMin(new BigDecimal("18")).salaryMax(new BigDecimal("22"))
                .description("Early mornings, great music, free coffee. Latte art not required but admired.").build());
        jobRepository.save(JobPosting.builder()
                .poster(who("alex")).page(pages.get("outfitters"))
                .title("Trail Guide").company("Trailhead Outfitters").location("Seattle, WA")
                .employmentType("CONTRACT").salaryMin(new BigDecimal("200")).salaryMax(new BigDecimal("300"))
                .description("Lead small groups on day hikes. Wilderness first aid certification required.").build());
        jobRepository.save(JobPosting.builder()
                .poster(who("mark"))
                .title("Senior Frontend Engineer").company("Facebook Clone").location("Menlo Park, CA").remote(true)
                .employmentType("FULL_TIME").salaryMin(new BigDecimal("150000")).salaryMax(new BigDecimal("210000"))
                .description("Own the News Feed UI. React, TypeScript, and a soft spot for 2018 design.").build());

        applicationRepository.save(JobApplication.builder().job(barista).applicant(who("john"))
                .message("I have made roughly ten thousand cortados.").email("john@facebook.dev").build());
    }

    // ---------------------------------------------------------------- dating ---

    private void seedDating() {
        dating("lena", "Looking for someone to get lost with. Bonus points for a good map.", "MEN", "Berlin, Germany");
        dating("aiko", "Let's get ramen and argue about anime.", "EVERYONE", "Osaka, Japan");
        dating("diego", "I will cook for you. That's the whole pitch.", "WOMEN", "Mexico City");
        dating("noah", "Runner seeking someone who can keep a conversation going at a 9-minute mile.", "WOMEN",
                "Chicago, IL");
        // Lena already likes Mark, so liking her back makes an instant match.
        datingProfileRepository.findByUserId(who("mark").getId()).orElseGet(() -> datingProfileRepository.save(
                DatingProfile.builder().user(who("mark")).bio("Building things. Also a decent tennis partner.")
                        .interestedIn("WOMEN").minAge(25).maxAge(45).city("Palo Alto, CA")
                        .photoUrls("https://picsum.photos/seed/markdate/600/800").build()));
        datingSwipeRepository.save(DatingSwipe.builder().from(who("lena")).to(who("mark")).liked(true).build());
    }

    private void dating(String key, String bio, String interestedIn, String city) {
        datingProfileRepository.save(DatingProfile.builder()
                .user(who(key)).bio(bio).interestedIn(interestedIn).minAge(21).maxAge(50).city(city)
                .photoUrls("https://picsum.photos/seed/" + key + "-face/600/800\nhttps://picsum.photos/seed/"
                        + key + "date/600/800")
                .build());
    }

    // -------------------------------------------------------------------- ads ---

    private void seedAds(Map<String, FbPage> pages) {
        ad(who("sarah"), pages.get("coffee"), "Two-for-one pour-overs before 9am",
                "Bring a friend, bring a thermos. Weekdays only.", "https://picsum.photos/seed/adcoffee/600/400",
                "https://morningritual.example", "SHOP_NOW");
        ad(who("alex"), pages.get("outfitters"), "Rent a full camping kit for $39",
                "Tent, stove and sleeping pad for the weekend.", "https://picsum.photos/seed/adcamp/600/400",
                "https://trailhead.example", "BOOK_NOW");
        ad(who("mark"), null, "Learn Spring Boot in 30 days",
                "Hands-on lessons, real projects, no slides.", "https://picsum.photos/seed/ad1/600/400",
                "https://springacademy.example", "SIGN_UP");
        ad(who("maya"), pages.get("film"), "Film photo walk - London, Sunday",
                "Meet at Tower Bridge. Bring a camera, any camera.", "https://picsum.photos/seed/adwalk/600/400",
                "https://filmclub.example", "LEARN_MORE");
    }

    private void ad(User advertiser, FbPage page, String title, String body, String image, String link, String cta) {
        adRepository.save(Ad.builder().advertiser(advertiser).page(page).title(title).body(body)
                .imageUrl(image).linkUrl(link).callToAction(cta).dailyBudget(new BigDecimal("20"))
                .impressions(120 + title.length() * 7L).clicks(4 + title.length() / 5).build());
    }

    // ----------------------------------------------------------------- games ---

    private void seedScores() {
        score("mark", "SNAKE", 34);
        score("priya", "SNAKE", 51);
        score("john", "SNAKE", 22);
        score("alex", "G2048", 2560);
        score("mark", "G2048", 1840);
        score("maya", "MEMORY", 820);
        score("sarah", "MEMORY", 760);
    }

    private void score(String key, String game, long score) {
        gameScoreRepository.save(GameScore.builder().user(who(key)).game(game).score(score).build());
    }

    // ------------------------------------------------------------- wall post ---

    /** Sarah wrote on Mark's timeline - the classic birthday-wall shape. */
    private void seedWallPostOnce() {
        boolean any = postRepository.findAll().stream().anyMatch(p -> p.getWallOwner() != null);
        if (any) return;
        Post post = Post.builder().author(who("sarah")).wallOwner(who("mark"))
                .content("Happy early birthday! Cake is on me this year, the good kind.")
                .privacy(Post.Privacy.FRIENDS).build();
        post.setCreatedAt(Instant.now().minus(4, ChronoUnit.HOURS));
        postRepository.save(post);
    }

    private void post(User author, String content, String imageUrl, int hoursAgo) {
        Post post = Post.builder().author(author).content(content).imageUrl(imageUrl)
                .privacy(Post.Privacy.PUBLIC).build();
        post.setCreatedAt(Instant.now().minus(hoursAgo, ChronoUnit.HOURS));
        postRepository.save(post);
    }

    private User who(String key) {
        User user = people.get(key);
        if (user == null) throw new IllegalStateException("Missing demo user " + key);
        return user;
    }
}
