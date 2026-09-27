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

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Fills an empty database with a small social graph so the feed is not blank on
 * first launch. Every demo account uses the password "password123".
 *
 * Mark, Priya, Alex, Maya and Sarah each get a full timeline - several posts, a
 * handful of them with photos - so their profiles have a populated Intro, a
 * Photos grid and a timeline worth scrolling. John stays deliberately sparse so
 * the quiet-profile case is still represented somewhere.
 */
@Component
@Profile("!test")
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository likeRepository;
    private final FriendshipRepository friendshipRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEMO_SECRET = "password123";

    /** Seeded photos come from picsum, sized for the widened feed column. */
    private static String photo(String seed) {
        return "https://picsum.photos/seed/" + seed + "/1000/600";
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded - skipping demo data");
            return;
        }

        User mark = user("mark@facebook.dev", "Mark", "Zuckerberg",
                "Building things that connect people.",
                "Dobbs Ferry, NY", "CEO at Facebook", "Harvard University",
                "male", LocalDate.of(1984, 5, 14));
        User sarah = user("sarah@facebook.dev", "Sarah", "Connor",
                "Coffee first. Always.",
                "Los Angeles, CA", "Systems Analyst at Cyberdyne", "UCLA",
                "female", LocalDate.of(1989, 11, 2));
        User john = user("john@facebook.dev", "John", "Doe",
                "Just here for the memes.",
                "Austin, TX", "Product Designer at Dribbble", "UT Austin",
                "male", LocalDate.of(1992, 3, 27));
        User priya = user("priya@facebook.dev", "Priya", "Sharma",
                "Travel. Food. Repeat. Currently collecting boarding passes.",
                "Mumbai, India", "Frontend Engineer at Swiggy", "IIT Bombay",
                "female", LocalDate.of(1994, 7, 9));
        User alex = user("alex@facebook.dev", "Alex", "Morgan",
                "Weekend hiker, weekday developer. 47 summits and counting.",
                "Seattle, WA", "Backend Engineer at Amazon", "University of Washington",
                "male", LocalDate.of(1991, 1, 18));
        User maya = user("maya@facebook.dev", "Maya", "Patel",
                "Photographer with a day job. Mostly shooting film.",
                "London, UK", "Data Scientist at DeepMind", "Imperial College London",
                "female", LocalDate.of(1993, 9, 30));

        List<User> users = List.of(mark, sarah, john, priya, alex, maya);
        userRepository.saveAll(users);

        // Everyone is friends with Mark; a few extra edges make mutuals interesting.
        for (User other : List.of(sarah, john, priya, alex, maya)) {
            friend(mark, other, Friendship.Status.ACCEPTED);
        }
        friend(sarah, john, Friendship.Status.ACCEPTED);
        friend(john, priya, Friendship.Status.ACCEPTED);
        friend(alex, sarah, Friendship.Status.ACCEPTED);
        friend(priya, maya, Friendship.Status.ACCEPTED);
        friend(alex, priya, Friendship.Status.ACCEPTED);
        // One pending request so the notifications badge has something to show.
        friend(maya, sarah, Friendship.Status.PENDING);

        List<Post> posts = new ArrayList<>();

        // ------------------------------------------------------------ Mark ---
        Post markFeed = post(posts, mark, "Just shipped a new version of the News Feed. Wider cards, more"
                + " breathing room, and the rails no longer fight you for the scrollbar. Let us know what"
                + " you think!", photo("markfeed"), "feeling proud", "Menlo Park, CA", 3);
        Post markTown = post(posts, mark, "Town hall on Friday. Bring the hard questions - those are the"
                + " ones worth an hour.", null, null, "Menlo Park, CA", 26);
        Post markRun = post(posts, mark, "Ran the loop around Bedwell Bayfront before the office filled up."
                + " Best thinking time of the week.", photo("markrun"), "feeling energised",
                "Menlo Park, CA", 51);
        Post markBooks = post(posts, mark, "Finished this year's reading list two months early. Taking"
                + " recommendations, preferably something that argues with me.", null, "feeling curious",
                null, 98);
        Post markConnect = post(posts, mark, "Connectivity update: another 40 million people came online"
                + " this quarter through partners in India, Nigeria and Brazil. Long way to go.",
                photo("markconnect"), null, null, 146);
        Post markBbq = post(posts, mark, "Smoked a brisket for 14 hours. Fourteen. It was worth roughly"
                + " thirteen of them.", photo("markbbq"), "feeling hungry", "Dobbs Ferry, NY", 195);
        Post markHarvard = post(posts, mark, "Back in Cambridge for the weekend. The dorm looks exactly the"
                + " same, which is somehow both comforting and alarming.", null, "feeling nostalgic",
                "Cambridge, MA", 244);

        // ----------------------------------------------------------- Priya ---
        Post priyaSea = post(posts, priya, "Sunset from the Bandra-Worli Sea Link tonight. No filter needed.",
                photo("priyasea"), "feeling grateful", "Mumbai, India", 9);
        Post priyaFood = post(posts, priya, "Vada pav at 11pm from the stall near the station is a complete"
                + " food group and I will not be debating this.", photo("priyafood"), "feeling hungry",
                "Mumbai, India", 33);
        Post priyaShip = post(posts, priya, "Shipped my first design-system release at work today. Forty"
                + " components, one token file, zero hard-coded hex values.", null, "feeling accomplished",
                null, 58);
        Post priyaGoa = post(posts, priya, "Three days in Goa. Zero plans. Highly recommend the combination.",
                photo("priyagoa"), "feeling relaxed", "Goa, India", 121);
        Post priyaCss = post(posts, priya, "Reminder that CSS grid solved this in 2017 and we are all still"
                + " nesting flexboxes out of habit.", null, null, null, 170);
        Post priyaRain = post(posts, priya, "First proper monsoon shower of the season. The whole city smells"
                + " like wet earth and chai.", photo("priyarain"), "feeling happy", "Mumbai, India", 219);
        Post priyaBooks = post(posts, priya, "Bought four books at the Kala Ghoda festival. Read none of"
                + " them. Balance restored next weekend.", null, null, "Mumbai, India", 292);

        // ------------------------------------------------------------ Alex ---
        Post alexSi = post(posts, alex, "Made it to the top of Mount Si before sunrise. Worth every step.",
                photo("alexsi"), "feeling accomplished", "Snoqualmie, WA", 30);
        Post alexRainier = post(posts, alex, "Rainier finally showed itself on the drive home. Three years in"
                + " Seattle and I still pull over every time.", photo("alexrainier"), null, "Seattle, WA", 54);
        Post alexLatency = post(posts, alex, "Spent two days chasing a 400ms latency spike. It was a DNS TTL."
                + " It is always DNS.", null, "feeling defeated", null, 79);
        Post alexGear = post(posts, alex, "New pack, new boots, same questionable decision-making about"
                + " weather windows.", photo("alexgear"), "feeling excited", null, 128);
        Post alexEnchant = post(posts, alex, "Enchantments through-hike done in a single day. 18 miles,"
                + " 4500ft of gain, and about nine hundred photos of goats.", photo("alexgoats"),
                "feeling exhausted", "Leavenworth, WA", 177);
        Post alexCoffee = post(posts, alex, "Unpopular Seattle opinion: the best coffee in this city comes"
                + " from a cart in a parking lot in Ballard.", null, null, "Seattle, WA", 226);
        Post alexPromo = post(posts, alex, "Started as a junior four years ago today. Signed off my first"
                + " design doc as the owner this morning. Slow and steady.", null, "feeling grateful",
                null, 299);

        // ------------------------------------------------------------ Maya ---
        Post mayaCamera = post(posts, maya, "New camera day. First roll came out better than expected.",
                photo("mayacamera"), "feeling excited", "London, UK", 72);
        Post mayaThames = post(posts, maya, "South Bank at blue hour. Shot on Portra 400, pushed one stop.",
                photo("mayathames"), null, "London, UK", 96);
        Post mayaDark = post(posts, maya, "Converted the spare bathroom into a darkroom. My flatmate has"
                + " questions. I have prints.", photo("mayadarkroom"), "feeling creative", "London, UK", 144);
        Post mayaModel = post(posts, maya, "The model that took three weeks to tune got beaten by logistic"
                + " regression this morning. Humbling, and slightly funny.", null, null, null, 168);
        Post mayaEdin = post(posts, maya, "Weekend in Edinburgh. Rained for 46 of 48 hours. Got the two"
                + " hours that mattered.", photo("mayaedinburgh"), "feeling lucky", "Edinburgh, UK", 217);
        Post mayaFilm = post(posts, maya, "Film is not better than digital. It is just slower, and slower is"
                + " what I actually needed.", null, "feeling thoughtful", null, 266);
        Post mayaMarket = post(posts, maya, "Borough Market on a Saturday is 40% food and 60% negotiating"
                + " your way past other people's tote bags.", photo("mayamarket"), null, "London, UK", 315);

        // ----------------------------------------------------------- Sarah ---
        Post sarahTimeline = post(posts, sarah, "Anyone else remember when the timeline was actually"
                + " chronological?", null, null, null, 48);
        Post sarahDesert = post(posts, sarah, "Drove out to Joshua Tree to see actual stars. Forgot how many"
                + " there are supposed to be.", photo("sarahdesert"), "feeling small", "Joshua Tree, CA", 88);
        Post sarahOncall = post(posts, sarah, "On call this week. If you need me I will be the one making"
                + " direct eye contact with a dashboard.", null, "feeling tired", "Los Angeles, CA", 137);
        Post sarahDog = post(posts, sarah, "Adopted a very large dog with a very small opinion of my"
                + " furniture. Worth it.", photo("sarahdog"), "feeling happy", "Los Angeles, CA", 186);
        Post sarahCoffee = post(posts, sarah, "Third coffee of the morning. The system is working as"
                + " designed.", null, null, null, 259);

        // ------------------------------------------------------------ John ---
        Post johnDark = post(posts, john, "Hot take: dark mode is overrated. 2018 blue forever.",
                null, "feeling nostalgic", null, 20);
        Post johnFigma = post(posts, john, "Spent all afternoon naming layers. This is the job. Nobody"
                + " warns you.", null, null, "Austin, TX", 111);
        Post johnTacos = post(posts, john, "Austin breakfast taco rankings, part one of an ongoing and"
                + " probably unwelcome series.", photo("johntacos"), "feeling hungry", "Austin, TX", 203);

        postRepository.saveAll(posts);

        // ------------------------------------------------------- engagement ---
        comment(markFeed, john, "Looks great! The card spacing is much better.");
        comment(markFeed, sarah, "Finally. Took you long enough.");
        comment(markFeed, priya, "The wider column makes a real difference on a big monitor.");
        comment(markFeed, maya, "Photos actually look like photos now.");
        comment(markTown, sarah, "Adding mine to the doc now.");
        comment(markRun, alex, "That loop is underrated. Try it counter-clockwise.");
        comment(markBooks, maya, "Anything by Ha-Joon Chang will argue with you politely for 300 pages.");
        comment(markConnect, priya, "Seeing this first-hand in the smaller cities here. It is working.");
        comment(markBbq, sarah, "Fourteen hours is a personality, not a recipe.");
        comment(markHarvard, john, "Did you check whether your old room still has the whiteboard?");

        comment(priyaSea, mark, "That view never gets old.");
        comment(priyaSea, maya, "The colour on this is unreal. Straight out of camera?");
        comment(priyaFood, john, "Now I am hungry and eleven time zones away.");
        comment(priyaShip, alex, "Congratulations. Design systems are thankless right up until they are not.");
        comment(priyaGoa, sarah, "Zero plans is the correct number of plans.");
        comment(priyaCss, alex, "Guilty. I nested three of them this morning.");
        comment(priyaRain, maya, "I miss this smell more than I expected to.");

        comment(alexSi, maya, "Incredible shot. What time did you start?");
        comment(alexSi, mark, "Before sunrise is doing a lot of work in that sentence.");
        comment(alexRainier, priya, "Adding this to the list for my next trip over.");
        comment(alexLatency, priya, "It is always DNS. Framed on my wall.");
        comment(alexEnchant, sarah, "Eighteen miles in a day is not hiking, that is fleeing something.");
        comment(alexPromo, mark, "Well earned. Congratulations.");

        comment(mayaCamera, priya, "Which body did you end up going with?");
        comment(mayaThames, alex, "Portra never misses.");
        comment(mayaDark, john, "Your flatmate is right to have questions.");
        comment(mayaModel, alex, "Logistic regression remains undefeated.");
        comment(mayaEdin, sarah, "Two good hours in Edinburgh is a statistical anomaly.");
        comment(mayaMarket, priya, "The tote bag observation is painfully accurate.");

        comment(sarahTimeline, priya, "Every single day.");
        comment(sarahDesert, maya, "The sky out there ruins city stars for you permanently.");
        comment(sarahOncall, alex, "Solidarity. Mine starts Monday.");
        comment(sarahDog, mark, "What is the dog called, and is it also very large?");

        comment(johnDark, alex, "Strongly disagree but I respect the confidence.");
        comment(johnFigma, priya, "Naming layers is 60% of design and nobody puts it on the job spec.");
        comment(johnTacos, priya, "Please continue this series indefinitely.");

        likes(markFeed, sarah, john, priya, alex, maya);
        likes(markTown, sarah, alex);
        likes(markRun, alex, priya);
        likes(markBooks, maya, john);
        likes(markConnect, priya, maya, alex);
        likes(markBbq, sarah, john, alex);
        likes(markHarvard, john, sarah);

        likes(priyaSea, mark, alex, maya, john);
        likes(priyaFood, john, sarah);
        likes(priyaShip, mark, alex, maya);
        likes(priyaGoa, sarah, maya);
        likes(priyaCss, alex);
        likes(priyaRain, mark, maya);
        likes(priyaBooks, maya);

        likes(alexSi, mark, sarah, john, priya);
        likes(alexRainier, maya, priya);
        likes(alexLatency, priya, sarah, maya);
        likes(alexGear, priya);
        likes(alexEnchant, mark, sarah, maya);
        likes(alexCoffee, sarah);
        likes(alexPromo, mark, sarah, priya, maya);

        likes(mayaCamera, mark, priya, alex);
        likes(mayaThames, priya, alex, sarah);
        likes(mayaDark, john, priya);
        likes(mayaModel, alex, priya);
        likes(mayaEdin, sarah, alex);
        likes(mayaFilm, priya);
        likes(mayaMarket, priya, john);

        likes(sarahTimeline, priya, john);
        likes(sarahDesert, maya, alex, mark);
        likes(sarahOncall, alex);
        likes(sarahDog, mark, priya, maya, john);
        likes(sarahCoffee, john);

        likes(johnDark, sarah, priya);
        likes(johnFigma, maya);
        likes(johnTacos, priya, alex);

        log.info("Seeded {} demo users and {} posts - sign in with mark@facebook.dev / {}",
                users.size(), posts.size(), DEMO_SECRET);
    }

    private User user(String email, String first, String last, String bio,
                      String hometown, String work, String education,
                      String gender, LocalDate birthDate) {
        return User.builder()
                .email(email)
                .password(passwordEncoder.encode(DEMO_SECRET))
                .firstName(first)
                .lastName(last)
                .bio(bio)
                .hometown(hometown)
                .work(work)
                .education(education)
                .gender(gender)
                .birthDate(birthDate)
                .avatarUrl("https://ui-avatars.com/api/?background=4267B2&color=fff&size=200&name="
                        + first + "+" + last)
                .coverUrl("https://picsum.photos/seed/" + first.toLowerCase() + "cover/851/315")
                .build();
    }

    private void friend(User a, User b, Friendship.Status status) {
        friendshipRepository.save(Friendship.builder()
                .requester(a).addressee(b).status(status).build());
    }

    /** Builds a post, back-dates it, adds it to the batch and hands it back. */
    private Post post(List<Post> sink, User author, String content, String imageUrl,
                      String feeling, String location, int hoursAgo) {
        Post p = Post.builder()
                .author(author)
                .content(content)
                .imageUrl(imageUrl)
                .feeling(feeling)
                .location(location)
                .privacy(Post.Privacy.PUBLIC)
                .build();
        // @CreatedDate would stamp "now" on all of them; back-date so the feed reads naturally.
        p.setCreatedAt(Instant.now().minus(hoursAgo, ChronoUnit.HOURS));
        sink.add(p);
        return p;
    }

    private void comment(Post post, User author, String content) {
        commentRepository.save(Comment.builder().post(post).author(author).content(content).build());
    }

    private void likes(Post post, User... users) {
        for (User user : users) {
            likeRepository.save(PostLike.builder().post(post).user(user).build());
        }
    }
}
