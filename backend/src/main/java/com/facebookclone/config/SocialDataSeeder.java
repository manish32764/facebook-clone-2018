package com.facebookclone.config;

import com.facebookclone.entity.*;
import com.facebookclone.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds the features added after the first release: Messenger threads, stories,
 * groups, events, Marketplace listings, videos for Watch and a handful of
 * notifications.
 *
 * Runs after {@link DataSeeder} and guards each section on its own table being
 * empty, so an existing database picks up the new content on the next boot
 * without its posts or friendships being touched.
 */
@Component
@Profile("!test")
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class SocialDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostLikeRepository likeRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final StoryRepository storyRepository;
    private final SocialGroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final EventRepository eventRepository;
    private final EventAttendeeRepository attendeeRepository;
    private final ListingRepository listingRepository;
    private final NotificationRepository notificationRepository;
    private final SavedPostRepository savedPostRepository;

    private Map<String, User> people = Map.of();

    @Override
    @Transactional
    public void run(String... args) {
        List<User> all = userRepository.findAll();
        if (all.isEmpty()) {
            log.warn("No users found - skipping the social seed");
            return;
        }
        people = new HashMap<>();
        for (User user : all) {
            people.put(user.getEmail().split("@")[0], user);
        }
        if (!people.containsKey("mark")) {
            log.info("Demo accounts are absent - skipping the social seed");
            return;
        }

        if (conversationRepository.count() == 0) seedConversations();
        if (storyRepository.count() == 0) seedStories();
        if (groupRepository.count() == 0) seedGroups();
        if (eventRepository.count() == 0) seedEvents();
        if (listingRepository.count() == 0) seedListings();
        if (notificationRepository.count() == 0) seedNotifications();
        seedVideosOnce();
        diversifyReactionsOnce();
        seedSavedOnce();

        log.info("Social seed complete: messenger, stories, groups, events, marketplace and watch");
    }

    // ------------------------------------------------------------- messenger ---

    private void seedConversations() {
        User mark = who("mark");
        User sarah = who("sarah");
        User priya = who("priya");
        User alex = who("alex");
        User maya = who("maya");
        User john = who("john");

        Conversation markSarah = direct(mark, sarah);
        say(markSarah, sarah, "Are we still on for the design review at 3?", 180);
        say(markSarah, mark, "Yes - I moved it to the big room, there are nine of us now.", 176);
        say(markSarah, sarah, "Nine? I budgeted for four sets of notes.", 174);
        say(markSarah, mark, "Bring the notes, I will bring the coffee.", 170);
        say(markSarah, sarah, "Deal. See you at 3.", 168);

        Conversation markPriya = direct(mark, priya);
        say(markPriya, priya, "Sent over the token file for the new feed cards.", 92);
        say(markPriya, mark, "Looking at it now. The spacing scale is much cleaner than what we had.", 90);
        say(markPriya, priya, "Forty components, zero hard-coded hex values. I checked twice.", 88);
        say(markPriya, mark, "Ship it.", 86);

        Conversation markAlex = direct(mark, alex);
        say(markAlex, alex, "That latency spike turned out to be a DNS TTL, by the way.", 40);
        say(markAlex, mark, "It is always DNS.", 39);
        say(markAlex, alex, "Framed on my wall by Friday.", 38);

        Conversation markMaya = direct(mark, maya);
        say(markMaya, maya, "Do you want the Bayfront shots in colour or black and white?", 20);
        say(markMaya, mark, "Colour. The morning light is doing all the work.", 18);
        withPhoto(markMaya, maya, "Here is the one I would lead with.",
                "https://picsum.photos/seed/mayasend/900/600", 16);
        say(markMaya, mark, "That is the one.", 15);

        Conversation markJohn = direct(mark, john);
        say(markJohn, john, "Hot take incoming: the layer naming convention needs a rewrite.", 8);
        say(markJohn, mark, "Write it up and I will read it properly.", 7);

        Conversation sarahPriya = direct(sarah, priya);
        say(sarahPriya, priya, "How is on-call week treating you?", 30);
        say(sarahPriya, sarah, "I have made direct eye contact with a dashboard for six hours.", 29);
        say(sarahPriya, priya, "Solidarity. Mine starts Monday.", 28);

        Conversation crew = group(mark, "Weekend Hike Crew", List.of(alex, sarah, maya, priya));
        say(crew, alex, "Trailhead at 6am Saturday. Snoqualmie is clear all weekend.", 60);
        say(crew, sarah, "Six is a number people say out loud without thinking about it.", 58);
        say(crew, maya, "I am in, but I am bringing three cameras and no excuses.", 57);
        say(crew, priya, "Joining from the group chat only. Emotional support hiker.", 56);
        say(crew, alex, "Emotional support hiker is a role. Adding you to the list.", 55);
        say(crew, mark, "I will drive. Four seats plus the boot for Maya.", 52);

        Conversation designSystem = group(priya, "Design System", List.of(mark, john, maya));
        say(designSystem, priya, "Release notes for 2.0 are in the doc. Breaking change on Button sizes.", 26);
        say(designSystem, john, "Breaking how? I have that in eleven places.", 25);
        say(designSystem, priya, "sm is now 28px instead of 24. Your eleven places get taller.", 24);
        say(designSystem, john, "That is the best kind of breaking change.", 23);
        say(designSystem, maya, "Charts will need a look. I will open a ticket.", 22);

        // Sarah has read everything in her thread with Mark; the crew chat has not been opened.
        read(markSarah, sarah);
        read(markSarah, mark);
        read(markPriya, mark);
        read(designSystem, priya);
    }

    // ---------------------------------------------------------- chat helpers ---

    private Conversation direct(User a, User b) {
        Conversation thread = conversationRepository.save(Conversation.builder()
                .type(Conversation.Type.DIRECT).createdBy(a).build());
        participantRepository.save(ConversationParticipant.builder().conversation(thread).user(a).build());
        participantRepository.save(ConversationParticipant.builder().conversation(thread).user(b).build());
        return thread;
    }

    private Conversation group(User creator, String name, List<User> others) {
        Conversation thread = conversationRepository.save(Conversation.builder()
                .type(Conversation.Type.GROUP).name(name).createdBy(creator).build());
        participantRepository.save(ConversationParticipant.builder()
                .conversation(thread).user(creator).build());
        for (User other : others) {
            participantRepository.save(ConversationParticipant.builder()
                    .conversation(thread).user(other).build());
        }
        return thread;
    }

    /** Back-dates the message so a seeded thread reads as a real conversation. */
    private Message say(Conversation thread, User sender, String content, int minutesAgo) {
        return persist(thread, sender, content, null, Message.Type.TEXT, minutesAgo);
    }

    private Message withPhoto(Conversation thread, User sender, String content, String url, int minutesAgo) {
        return persist(thread, sender, content, url, Message.Type.IMAGE, minutesAgo);
    }

    private Message persist(Conversation thread, User sender, String content,
                            String attachment, Message.Type type, int minutesAgo) {
        Message message = Message.builder()
                .conversation(thread).sender(sender).content(content)
                .attachmentUrl(attachment).type(type).build();
        message.setCreatedAt(Instant.now().minus(minutesAgo, ChronoUnit.MINUTES));
        Message saved = messageRepository.save(message);

        if (thread.getLastMessageAt() == null || thread.getLastMessageAt().isBefore(saved.getCreatedAt())) {
            thread.setLastMessageAt(saved.getCreatedAt());
            conversationRepository.save(thread);
        }
        return saved;
    }

    /** Marks a thread read for one person, so some rows start bold and some do not. */
    private void read(Conversation thread, User user) {
        participantRepository.findByConversationIdAndUserId(thread.getId(), user.getId())
                .ifPresent(participant -> {
                    participant.setLastReadAt(Instant.now());
                    participantRepository.save(participant);
                });
    }

    // ---------------------------------------------------------------- stories ---

    private void seedStories() {
        story(who("priya"), "https://picsum.photos/seed/priyastory/720/1280", null, 2);
        story(who("priya"), null, "Monsoon, day one. Chai count: three.", 1);
        story(who("maya"), "https://picsum.photos/seed/mayastory/720/1280", null, 5);
        story(who("maya"), "https://picsum.photos/seed/mayastory2/720/1280", null, 4);
        story(who("alex"), "https://picsum.photos/seed/alexstory/720/1280", null, 7);
        story(who("sarah"), null, "On call. Send coffee, not incidents.", 3);
        story(who("john"), "https://picsum.photos/seed/johnstory/720/1280", null, 9);
    }

    private void story(User author, String imageUrl, String text, int hoursAgo) {
        Instant createdAt = Instant.now().minus(hoursAgo, ChronoUnit.HOURS);
        Story story = Story.builder()
                .author(author)
                .imageUrl(imageUrl)
                .text(text)
                .backgroundColor(imageUrl == null ? "#4267b2" : null)
                .build();
        story.setCreatedAt(createdAt);
        story.setExpiresAt(createdAt.plus(24, ChronoUnit.HOURS));
        storyRepository.save(story);
    }

    // ----------------------------------------------------------------- groups ---

    private void seedGroups() {
        SocialGroup frontend = group("Frontend Engineers",
                "CSS grid apologists, flexbox survivors, and anyone who has ever named a layer.",
                "https://picsum.photos/seed/groupfe/1200/400", SocialGroup.Privacy.PUBLIC, who("priya"));
        members(frontend, who("john"), who("mark"), who("maya"));

        SocialGroup hikers = group("Pacific Northwest Hikers",
                "Trail conditions, weather windows and photographs of goats.",
                "https://picsum.photos/seed/grouphike/1200/400", SocialGroup.Privacy.PUBLIC, who("alex"));
        members(hikers, who("sarah"), who("mark"));

        SocialGroup film = group("Shooting Film in 2018",
                "Slower is the point. Portra, HP5 and darkrooms in spare bathrooms.",
                "https://picsum.photos/seed/groupfilm/1200/400", SocialGroup.Privacy.PUBLIC, who("maya"));
        members(film, who("priya"), who("john"));

        SocialGroup oncall = group("On Call Support Group",
                "A private room for people currently making eye contact with a dashboard.",
                "https://picsum.photos/seed/grouponcall/1200/400", SocialGroup.Privacy.PRIVATE, who("sarah"));
        members(oncall, who("alex"));

        groupPost(frontend, who("priya"), "Design system 2.0 is out. Button sm is 28px now, plan accordingly.",
                null, 20);
        groupPost(frontend, who("john"), "Does anyone actually like BEM or have we all just accepted it?",
                null, 14);
        groupPost(frontend, who("maya"), "Charts in the new token set, before I open a ticket about the axes.",
                "https://picsum.photos/seed/groupcharts/1000/600", 9);
        groupPost(hikers, who("alex"), "Snoqualmie is clear all weekend. Trailhead at 6am Saturday.",
                "https://picsum.photos/seed/grouptrail/1000/600", 18);
        groupPost(hikers, who("sarah"), "Six in the morning is a number people say without thinking about it.",
                null, 17);
        groupPost(film, who("maya"), "Pushed a roll of Portra one stop. Worth it for blue hour.",
                "https://picsum.photos/seed/groupportra/1000/600", 26);
    }

    private SocialGroup group(String name, String description, String coverUrl,
                              SocialGroup.Privacy privacy, User creator) {
        SocialGroup group = groupRepository.save(SocialGroup.builder()
                .name(name).description(description).coverUrl(coverUrl)
                .privacy(privacy).createdBy(creator).build());
        groupMemberRepository.save(GroupMember.builder()
                .group(group).user(creator).role(GroupMember.Role.ADMIN).build());
        return group;
    }

    private void members(SocialGroup group, User... users) {
        for (User user : users) {
            groupMemberRepository.save(GroupMember.builder()
                    .group(group).user(user).role(GroupMember.Role.MEMBER).build());
        }
    }

    private void groupPost(SocialGroup group, User author, String content, String imageUrl, int hoursAgo) {
        Post post = Post.builder()
                .author(author).content(content).imageUrl(imageUrl)
                .group(group).privacy(Post.Privacy.PUBLIC).build();
        post.setCreatedAt(Instant.now().minus(hoursAgo, ChronoUnit.HOURS));
        postRepository.save(post);
    }

    // ----------------------------------------------------------------- events ---

    private void seedEvents() {
        Event review = event("Design Review: News Feed 2.0",
                "Walk-through of the wider cards, the new spacing scale and what it does to the rails.",
                "https://picsum.photos/seed/eventreview/1200/500",
                "Building 20, Menlo Park", 2, 2, false, who("mark"));
        going(review, who("priya"), who("john"), who("maya"));
        interested(review, who("sarah"));

        Event hike = event("Mount Si Sunrise Hike",
                "Trailhead at 6am. Eight miles, 3100ft of gain, and coffee afterwards in North Bend.",
                "https://picsum.photos/seed/eventhike/1200/500",
                "Snoqualmie, WA", 5, 8, false, who("alex"));
        going(hike, who("sarah"), who("mark"));
        interested(hike, who("maya"), who("priya"));

        Event darkroom = event("Darkroom Basics Workshop",
                "Developing your first roll of black and white, in an actual spare bathroom.",
                "https://picsum.photos/seed/eventdark/1200/500",
                "Peckham, London", 9, 4, false, who("maya"));
        going(darkroom, who("priya"));
        interested(darkroom, who("john"), who("alex"));

        Event meetup = event("Frontend Meetup: Tokens and Themes",
                "Lightning talks on design tokens, dark mode and why nobody agrees on spacing scales.",
                "https://picsum.photos/seed/eventmeet/1200/500",
                null, 14, 3, true, who("priya"));
        going(meetup, who("john"), who("maya"));

        Event townhall = event("Q3 Town Hall",
                "Bring the hard questions. Those are the ones worth an hour.",
                "https://picsum.photos/seed/eventtown/1200/500",
                "Menlo Park, CA", -20, 1, false, who("mark"));
        going(townhall, who("sarah"), who("john"), who("priya"), who("alex"), who("maya"));
    }

    /** daysFromNow may be negative, which seeds a past event. */
    private Event event(String name, String description, String coverUrl, String location,
                        int daysFromNow, int durationHours, boolean online, User host) {
        Instant startsAt = Instant.now().plus(daysFromNow, ChronoUnit.DAYS)
                .truncatedTo(ChronoUnit.HOURS);
        Event event = eventRepository.save(Event.builder()
                .name(name).description(description).coverUrl(coverUrl).location(location)
                .startsAt(startsAt).endsAt(startsAt.plus(durationHours, ChronoUnit.HOURS))
                .online(online).host(host).build());
        attendeeRepository.save(EventAttendee.builder()
                .event(event).user(host).status(EventAttendee.Status.GOING).build());
        return event;
    }

    private void going(Event event, User... users) {
        respond(event, EventAttendee.Status.GOING, users);
    }

    private void interested(Event event, User... users) {
        respond(event, EventAttendee.Status.INTERESTED, users);
    }

    private void respond(Event event, EventAttendee.Status status, User... users) {
        for (User user : users) {
            attendeeRepository.save(EventAttendee.builder()
                    .event(event).user(user).status(status).build());
        }
    }

    // ------------------------------------------------------------ marketplace ---

    private void seedListings() {
        listing(who("maya"), "Canon AE-1 Program with 50mm f/1.8", "Fully working, light seals replaced"
                + " last year. Comes with a strap and two rolls of Portra.", "245.00", "Hobbies",
                "London, UK", "mkcanon", Listing.Condition.USED_GOOD, 30);
        listing(who("alex"), "Osprey Atmos 65 pack", "Two seasons of use, one repaired buckle. Frame is"
                + " straight and the hipbelt has plenty left in it.", "120.00", "Hobbies",
                "Seattle, WA", "mkpack", Listing.Condition.USED_GOOD, 52);
        listing(who("john"), "Herman Miller Aeron, size B", "Bought it during a strong opinion about"
                + " posture. The opinion held; the apartment did not.", "480.00", "Home & Garden",
                "Austin, TX", "mkchair", Listing.Condition.USED_LIKE_NEW, 18);
        listing(who("priya"), "Mechanical keyboard, hot-swap 65%", "Gateron browns, PBT caps, USB-C."
                + " Typed one design system on it and it survived.", "85.00", "Electronics",
                "Mumbai, India", "mkkeeb", Listing.Condition.USED_LIKE_NEW, 8);
        listing(who("sarah"), "Roof box, 400 litre", "Fits a factory rail. Slightly scuffed from one"
                + " memorable drive to Joshua Tree.", "160.00", "Vehicles",
                "Los Angeles, CA", "mkbox", Listing.Condition.USED_FAIR, 76);
        listing(who("maya"), "Darkroom enlarger, Durst M305", "Upgrading. Includes two lenses and a"
                + " timer that mostly agrees with the clock.", "300.00", "Hobbies",
                "London, UK", "mkenlarger", Listing.Condition.USED_GOOD, 96);
        listing(who("alex"), "Yamaha FG800 acoustic", "Bought in a hopeful January. Barely played,"
                + " which is honest rather than a selling point.", "175.00", "Musical Instruments",
                "Seattle, WA", "mkguitar", Listing.Condition.USED_LIKE_NEW, 120);
        listing(who("john"), "Two monitor arms, free to a good desk", "Both clamp-mount, both work."
                + " Collection only, and you must take the cable ties too.", "0.00", "Free Stuff",
                "Austin, TX", "mkarms", Listing.Condition.USED_GOOD, 6);
    }

    private void listing(User seller, String title, String description, String price, String category,
                         String location, String imageSeed, Listing.Condition condition, int hoursAgo) {
        Listing listing = Listing.builder()
                .seller(seller).title(title).description(description)
                .price(new BigDecimal(price)).currency("USD")
                .category(category).location(location)
                .imageUrl("https://picsum.photos/seed/" + imageSeed + "/800/600")
                .condition(condition).status(Listing.Status.AVAILABLE).build();
        listing.setCreatedAt(Instant.now().minus(hoursAgo, ChronoUnit.HOURS));
        listingRepository.save(listing);
    }

    // ---------------------------------------------------------------- watch ---

    /**
     * A few video posts so Watch has something in it. Guarded on there being no
     * video anywhere rather than on the posts table, which the first seeder owns.
     */
    private void seedVideosOnce() {
        boolean anyVideo = postRepository.findAll().stream().anyMatch(p -> p.getVideoUrl() != null);
        if (anyVideo) return;

        video(who("mark"), "Two minutes on why the feed got wider. Sound on for the part about the rails.",
                "BigBuckBunny", "markvid", 12);
        video(who("alex"), "Sunrise timelapse from the Mount Si summit. Four hundred frames, one flask.",
                "ElephantsDream", "alexvid", 34);
        video(who("maya"), "Developing a roll start to finish, in real time, in a bathroom.",
                "ForBiggerBlazes", "mayavid", 58);
        video(who("priya"), "Walking the Sea Link at sunset. No narration, just traffic and light.",
                "ForBiggerFun", "priyavid", 80);
        video(who("sarah"), "The dog meets the sofa. The sofa loses.",
                "ForBiggerJoyrides", "sarahvid", 104);
    }

    private void video(User author, String content, String sample, String posterSeed, int hoursAgo) {
        Post post = Post.builder()
                .author(author)
                .content(content)
                .videoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/"
                        + sample + ".mp4")
                .imageUrl("https://picsum.photos/seed/" + posterSeed + "/1000/562")
                .privacy(Post.Privacy.PUBLIC)
                .build();
        post.setCreatedAt(Instant.now().minus(hoursAgo, ChronoUnit.HOURS));
        postRepository.save(post);
    }

    // --------------------------------------------------------- notifications ---

    private void seedNotifications() {
        User mark = who("mark");
        notify(mark, who("sarah"), Notification.Type.POST_REACTION,
                "Sarah Connor reacted \u2764\uFE0F to your post.", "/", 45);
        notify(mark, who("priya"), Notification.Type.COMMENT,
                "Priya Sharma commented on your post.", "/", 120);
        notify(mark, who("maya"), Notification.Type.MESSAGE,
                "Maya Patel: That is the one.", "/messages", 15);
        notify(mark, who("alex"), Notification.Type.EVENT_INVITE,
                "Alex Morgan invited you to Mount Si Sunrise Hike.", "/events", 300);
        notify(mark, who("john"), Notification.Type.POST_SHARE,
                "John Doe shared your post.", "/", 480);
        notify(who("sarah"), who("maya"), Notification.Type.FRIEND_REQUEST,
                "Maya Patel sent you a friend request.", "/friends", 60);
    }

    private void notify(User recipient, User actor, Notification.Type type,
                        String text, String link, int minutesAgo) {
        Notification notification = Notification.builder()
                .recipient(recipient).actor(actor).type(type).text(text).link(link)
                .read(minutesAgo > 240)
                .build();
        notification.setCreatedAt(Instant.now().minus(minutesAgo, ChronoUnit.MINUTES));
        notificationRepository.save(notification);
    }

    // ------------------------------------------------------------ reactions ---

    /**
     * The first seeder wrote every engagement as a plain LIKE. Spreading a few
     * across the other five reactions is what makes the face stack under a post
     * look like the real thing on first load.
     */
    private void diversifyReactionsOnce() {
        List<PostLike> likes = likeRepository.findAll();
        boolean alreadyMixed = likes.stream().anyMatch(l -> l.reactionOrLike() != ReactionType.LIKE);
        if (likes.isEmpty() || alreadyMixed) return;

        ReactionType[] palette = {
                ReactionType.LIKE, ReactionType.LIKE, ReactionType.LOVE, ReactionType.LIKE,
                ReactionType.HAHA, ReactionType.LIKE, ReactionType.WOW, ReactionType.LOVE,
                ReactionType.LIKE, ReactionType.SAD, ReactionType.LIKE, ReactionType.ANGRY,
        };

        List<PostLike> changed = new ArrayList<>();
        for (int i = 0; i < likes.size(); i++) {
            PostLike like = likes.get(i);
            like.setReaction(palette[i % palette.length]);
            changed.add(like);
        }
        likeRepository.saveAll(changed);
    }

    // ---------------------------------------------------------------- saved ---

    /** A couple of saved posts so the Saved page is not empty on first visit. */
    private void seedSavedOnce() {
        User mark = who("mark");
        if (savedPostRepository.countByUserId(mark.getId()) > 0) return;

        List<Post> candidates = postRepository.findAll().stream()
                .filter(p -> !p.getAuthor().getId().equals(mark.getId()))
                .filter(p -> p.getGroup() == null)
                .filter(p -> p.getImageUrl() != null)
                .limit(3)
                .toList();

        for (Post post : candidates) {
            savedPostRepository.save(SavedPost.builder().user(mark).post(post).build());
        }
    }

    private User who(String key) {
        return people.get(key);
    }
}
