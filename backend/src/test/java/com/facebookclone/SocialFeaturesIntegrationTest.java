package com.facebookclone;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the features added after the first release: Messenger, notifications,
 * threaded comments, sharing, saving, stories, groups, events and Marketplace.
 *
 * Each test registers its own accounts so nothing depends on the demo seed or on
 * the order the tests happen to run in.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SocialFeaturesIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // ------------------------------------------------------------- messenger ---

    @Test
    void messagingBetweenTwoPeopleReusesOneThread() throws Exception {
        Account alice = register("chat-alice@example.com");
        Account bob = register("chat-bob@example.com");

        long conversationId = json(callPost("/api/messages/with/" + bob.id, alice)).get("id").asLong();

        // Opening the same direct thread twice must not create a second one.
        long again = json(callPost("/api/messages/with/" + bob.id, alice)).get("id").asLong();
        assertThat(again).isEqualTo(conversationId);

        mockMvc.perform(post("/api/messages/conversations/" + conversationId)
                        .header("Authorization", "Bearer " + alice.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Are we still on for 3?\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Are we still on for 3?"));

        // Bob has one unread message, and a notification about it.
        mockMvc.perform(get("/api/notifications/counts").header("Authorization", "Bearer " + bob.token))
                .andExpect(jsonPath("$.messages").value(1))
                .andExpect(jsonPath("$.notifications").value(1));

        // Reading the thread clears the badge.
        mockMvc.perform(post("/api/messages/conversations/" + conversationId + "/read")
                        .header("Authorization", "Bearer " + bob.token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notifications/counts").header("Authorization", "Bearer " + bob.token))
                .andExpect(jsonPath("$.messages").value(0));

        JsonNode thread = json(callGet("/api/messages/conversations/" + conversationId, bob));
        assertThat(thread.get("messages")).hasSize(1);
        assertThat(thread.get("conversation").get("title").asText()).isEqualTo("Test User");
    }

    @Test
    void aStrangerCannotReadSomeoneElsesThread() throws Exception {
        Account alice = register("nosy-alice@example.com");
        Account bob = register("nosy-bob@example.com");
        Account stranger = register("nosy-eve@example.com");

        long conversationId = json(callPost("/api/messages/with/" + bob.id, alice)).get("id").asLong();

        mockMvc.perform(get("/api/messages/conversations/" + conversationId)
                        .header("Authorization", "Bearer " + stranger.token))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------- comments ---

    @Test
    void repliesNestUnderTheirParentComment() throws Exception {
        Account author = register("thread-author@example.com");
        long postId = createPost(author, "Threaded comments, please");

        long parentId = json(comment(postId, author, "{\"content\":\"First\"}")).get("id").asLong();

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + author.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"A reply\",\"parentId\":" + parentId + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.parentId").value(parentId));

        JsonNode comments = json(callGet("/api/posts/" + postId + "/comments", author));
        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).get("replies")).hasSize(1);
        assertThat(comments.get(0).get("replies").get(0).get("content").asText()).isEqualTo("A reply");
    }

    // ---------------------------------------------------- sharing and saving ---

    @Test
    void sharingKeepsTheOriginalAndCountsTheShare() throws Exception {
        Account author = register("share-author@example.com");
        long postId = createPost(author, "Worth passing on");

        JsonNode share = json(mockMvc.perform(post("/api/posts/" + postId + "/share")
                        .header("Authorization", "Bearer " + author.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Read this\",\"privacy\":\"PUBLIC\"}"))
                .andExpect(status().isCreated()));

        assertThat(share.get("sharedPost").get("id").asLong()).isEqualTo(postId);
        assertThat(share.get("content").asText()).isEqualTo("Read this");

        mockMvc.perform(get("/api/posts/" + postId).header("Authorization", "Bearer " + author.token))
                .andExpect(jsonPath("$.shareCount").value(1));
    }

    @Test
    void savingAPostIsAToggleAndShowsUpInSaved() throws Exception {
        Account author = register("save-author@example.com");
        long postId = createPost(author, "Save me for later");

        mockMvc.perform(post("/api/posts/" + postId + "/save")
                        .header("Authorization", "Bearer " + author.token))
                .andExpect(jsonPath("$.saved").value(true));

        assertThat(json(callGet("/api/posts/saved", author))).hasSize(1);

        mockMvc.perform(post("/api/posts/" + postId + "/save")
                        .header("Authorization", "Bearer " + author.token))
                .andExpect(jsonPath("$.saved").value(false));

        assertThat(json(callGet("/api/posts/saved", author))).isEmpty();
    }

    // ------------------------------------------------- groups, events, items ---

    @Test
    void groupPostsAreVisibleToMembersAndAbsentFromTimelines() throws Exception {
        Account owner = register("group-owner@example.com");

        long groupId = json(mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + owner.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test Group\",\"privacy\":\"PUBLIC\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.myRole").value("ADMIN")))
                .get("id").asLong();

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + owner.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hello group\",\"groupId\":" + groupId + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.group.id").value(groupId));

        assertThat(json(callGet("/api/posts/group/" + groupId, owner))).hasSize(1);

        // A group post belongs to the group, not to the author's own timeline.
        assertThat(json(callGet("/api/posts/user/" + owner.id, owner))).isEmpty();

        // It does reach the News Feed of every member, which is the author here.
        assertThat(json(callGet("/api/posts", owner))).hasSize(1);
    }

    @Test
    void nonMembersCannotPostInAGroup() throws Exception {
        Account owner = register("closed-owner@example.com");
        Account outsider = register("closed-outsider@example.com");

        long groupId = json(mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + owner.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Members Only\",\"privacy\":\"PUBLIC\"}"))
                .andExpect(status().isCreated()))
                .get("id").asLong();

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + outsider.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Let me in\",\"groupId\":" + groupId + "}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void respondingToAnEventUpdatesItsCounts() throws Exception {
        Account host = register("event-host@example.com");
        Account guest = register("event-guest@example.com");

        long eventId = json(mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + host.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test Event\",\"startsAt\":\"2030-01-01T10:00:00Z\"}"))
                .andExpect(status().isCreated())
                // Creating an event marks the host as going.
                .andExpect(jsonPath("$.goingCount").value(1)))
                .get("id").asLong();

        mockMvc.perform(post("/api/events/" + eventId + "/respond")
                        .header("Authorization", "Bearer " + guest.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"GOING\"}"))
                .andExpect(jsonPath("$.goingCount").value(2))
                .andExpect(jsonPath("$.myStatus").value("GOING"));

        // Switching the reply moves the person between the two counts.
        mockMvc.perform(post("/api/events/" + eventId + "/respond")
                        .header("Authorization", "Bearer " + guest.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INTERESTED\"}"))
                .andExpect(jsonPath("$.goingCount").value(1))
                .andExpect(jsonPath("$.interestedCount").value(1));
    }

    @Test
    void onlyTheSellerCanChangeAListing() throws Exception {
        Account seller = register("listing-seller@example.com");
        Account buyer = register("listing-buyer@example.com");

        long listingId = json(mockMvc.perform(post("/api/marketplace")
                        .header("Authorization", "Bearer " + seller.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Old camera\",\"price\":120.00,\"category\":\"Hobbies\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mine").value(true)))
                .get("id").asLong();

        callPatch("/api/marketplace/" + listingId + "/status", buyer, "{\"status\":\"SOLD\"}")
                .andExpect(status().isForbidden());

        callPatch("/api/marketplace/" + listingId + "/status", seller, "{\"status\":\"SOLD\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SOLD"));
    }

    // --------------------------------------------------------------- stories ---

    @Test
    void aStoryAppearsInYourOwnReel() throws Exception {
        Account author = register("story-author@example.com");

        mockMvc.perform(post("/api/stories")
                        .header("Authorization", "Bearer " + author.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"First story\",\"backgroundColor\":\"#4267b2\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("First story"));

        JsonNode reels = json(callGet("/api/stories", author));
        assertThat(reels).hasSize(1);
        assertThat(reels.get(0).get("author").get("id").asLong()).isEqualTo(author.id);
        assertThat(reels.get(0).get("stories")).hasSize(1);
    }

    // ---------------------------------------------------------------- search ---

    @Test
    void searchFindsPeopleAndPosts() throws Exception {
        Account author = register("search-author@example.com");
        createPost(author, "A post about kintsugi pottery");

        JsonNode results = json(callGet("/api/search?q=kintsugi", author));
        assertThat(results.get("posts")).hasSize(1);

        // Two characters is the floor; anything shorter returns empty sections.
        JsonNode tooShort = json(callGet("/api/search?q=k", author));
        assertThat(tooShort.get("posts")).isEmpty();
        assertThat(tooShort.get("people")).isEmpty();
    }

    // --------------------------------------------------------------- helpers ---

    private record Account(long id, String token) {}

    private Account register(String email) throws Exception {
        String body = "{\"firstName\":\"Test\",\"lastName\":\"User\",\"email\":\"" + email
                + "\",\"password\":\"password123\"}";

        JsonNode response = objectMapper.readTree(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());

        return new Account(response.get("user").get("id").asLong(), response.get("token").asText());
    }

    private long createPost(Account account, String content) throws Exception {
        return json(mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + account.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + content + "\",\"privacy\":\"PUBLIC\"}"))
                .andExpect(status().isCreated()))
                .get("id").asLong();
    }

    private ResultActions comment(long postId, Account account, String body) throws Exception {
        return mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + account.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    /** POST with no body, as the toggle-style endpoints take. */
    private ResultActions callPost(String url, Account account) throws Exception {
        return mockMvc.perform(post(url).header("Authorization", "Bearer " + account.token))
                .andExpect(status().is2xxSuccessful());
    }

    private ResultActions callGet(String url, Account account) throws Exception {
        return mockMvc.perform(get(url).header("Authorization", "Bearer " + account.token))
                .andExpect(status().isOk());
    }

    private ResultActions callPatch(String url, Account account, String body) throws Exception {
        return mockMvc.perform(patch(url)
                .header("Authorization", "Bearer " + account.token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString());
    }
}
