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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Audiences, blocking, private-group approval, nested comments, following and
 * pokes. Each test registers its own accounts.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SafetyAndAudienceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void friendsOnlyPostsAreHiddenFromStrangers() throws Exception {
        Account author = register("aud-author@example.com");
        Account friend = register("aud-friend@example.com");
        Account stranger = register("aud-stranger@example.com");
        befriend(author, friend);

        long postId = createPost(author, "{\"content\":\"Friends only\",\"privacy\":\"FRIENDS\"}");

        assertThat(json(get200("/api/posts/user/" + author.id, friend))).hasSize(1);
        assertThat(json(get200("/api/posts/user/" + author.id, stranger))).isEmpty();
        mockMvc.perform(get("/api/posts/" + postId).header("Authorization", "Bearer " + stranger.token))
                .andExpect(status().isNotFound());
    }

    @Test
    void specificAndExceptAudiencesAreRespected() throws Exception {
        Account author = register("spec-author@example.com");
        Account chosen = register("spec-chosen@example.com");
        Account other = register("spec-other@example.com");
        befriend(author, chosen);
        befriend(author, other);

        createPost(author, "{\"content\":\"Just you\",\"privacy\":\"SPECIFIC\",\"audienceUserIds\":[" + chosen.id + "]}");
        createPost(author, "{\"content\":\"Not you\",\"privacy\":\"FRIENDS_EXCEPT\",\"audienceUserIds\":[" + chosen.id + "]}");

        JsonNode seenByChosen = json(get200("/api/posts/user/" + author.id, chosen));
        JsonNode seenByOther = json(get200("/api/posts/user/" + author.id, other));

        assertThat(seenByChosen).hasSize(1);
        assertThat(seenByChosen.get(0).get("content").asText()).isEqualTo("Just you");
        assertThat(seenByOther).hasSize(1);
        assertThat(seenByOther.get(0).get("content").asText()).isEqualTo("Not you");
    }

    @Test
    void blockingHidesProfilesPostsAndStopsMessages() throws Exception {
        Account me = register("block-me@example.com");
        Account them = register("block-them@example.com");
        befriend(me, them);
        createPost(them, "{\"content\":\"Visible until blocked\",\"privacy\":\"PUBLIC\"}");

        mockMvc.perform(post("/api/blocks/" + them.id).header("Authorization", "Bearer " + me.token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/" + them.id).header("Authorization", "Bearer " + me.token))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/users/" + me.id).header("Authorization", "Bearer " + them.token))
                .andExpect(status().isNotFound());
        assertThat(json(get200("/api/posts", me))).isEmpty();
        // Blocking ended the friendship.
        assertThat(json(get200("/api/friends", me))).isEmpty();
        mockMvc.perform(post("/api/messages/with/" + me.id).header("Authorization", "Bearer " + them.token))
                .andExpect(status().isNotFound());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/blocks/" + them.id).header("Authorization", "Bearer " + me.token))
                .andExpect(status().isNoContent());
        get200("/api/users/" + them.id, me);
    }

    @Test
    void privateGroupsNeedApprovalAndCanRequirePostApproval() throws Exception {
        Account admin = register("pg-admin@example.com");
        Account joiner = register("pg-joiner@example.com");

        long groupId = json(send("/api/groups", admin, "{\"name\":\"Secret Club\",\"privacy\":\"PRIVATE\"}")
                .andExpect(status().isCreated())).get("id").asLong();

        JsonNode afterAsking = json(send("/api/groups/" + groupId + "/join", joiner, "{\"answer\":\"Please\"}"));
        assertThat(afterAsking.get("joined").asBoolean()).isFalse();
        assertThat(afterAsking.get("requestPending").asBoolean()).isTrue();

        // Outsiders cannot read the feed of a private group.
        assertThat(json(get200("/api/posts/group/" + groupId, joiner))).isEmpty();

        JsonNode requests = json(get200("/api/groups/" + groupId + "/requests", admin));
        assertThat(requests).hasSize(1);
        mockMvc.perform(post("/api/groups/" + groupId + "/requests/" + joiner.id + "/approve")
                        .header("Authorization", "Bearer " + admin.token))
                .andExpect(status().isNoContent());
        assertThat(json(get200("/api/groups/" + groupId, joiner)).get("joined").asBoolean()).isTrue();

        // Turn on post approval: the member's post waits, then appears once approved.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .patch("/api/groups/" + groupId)
                        .header("Authorization", "Bearer " + admin.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"postApproval\":true}"))
                .andExpect(status().isOk());

        JsonNode pending = json(send("/api/posts", joiner, "{\"content\":\"Hi all\",\"groupId\":" + groupId + "}")
                .andExpect(status().isCreated()));
        assertThat(pending.get("pending").asBoolean()).isTrue();
        assertThat(json(get200("/api/posts/group/" + groupId, admin))).isEmpty();

        mockMvc.perform(post("/api/posts/" + pending.get("id").asLong() + "/approve")
                        .header("Authorization", "Bearer " + admin.token))
                .andExpect(status().isOk());
        assertThat(json(get200("/api/posts/group/" + groupId, admin))).hasSize(1);
    }

    @Test
    void repliesNestSeveralLevelsAndCommentsTakeReactions() throws Exception {
        Account author = register("nest-author@example.com");
        long postId = createPost(author, "{\"content\":\"Thread\",\"privacy\":\"PUBLIC\"}");

        long first = json(send("/api/posts/" + postId + "/comments", author, "{\"content\":\"one\"}")).get("id").asLong();
        long second = json(send("/api/posts/" + postId + "/comments", author,
                "{\"content\":\"two\",\"parentId\":" + first + "}")).get("id").asLong();
        long third = json(send("/api/posts/" + postId + "/comments", author,
                "{\"content\":\"three\",\"parentId\":" + second + "}")).get("id").asLong();

        JsonNode tree = json(get200("/api/posts/" + postId + "/comments", author));
        assertThat(tree.get(0).get("replies").get(0).get("replies").get(0).get("id").asLong()).isEqualTo(third);

        JsonNode reacted = json(send("/api/posts/comments/" + third + "/react", author, "{\"reaction\":\"LOVE\"}"));
        assertThat(reacted.get("reactions").get("myReaction").asText()).isEqualTo("LOVE");

        // Deleting the top comment takes its whole thread with it.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/posts/comments/" + first)
                        .header("Authorization", "Bearer " + author.token))
                .andExpect(status().isNoContent());
        assertThat(json(get200("/api/posts/" + postId + "/comments", author))).isEmpty();
    }

    @Test
    void followersSeePublicPostsAndPokesWaitForAReply() throws Exception {
        Account celeb = register("follow-celeb@example.com");
        Account fan = register("follow-fan@example.com");
        createPost(celeb, "{\"content\":\"Hello world\",\"privacy\":\"PUBLIC\"}");
        createPost(celeb, "{\"content\":\"Friends only\",\"privacy\":\"FRIENDS\"}");

        JsonNode follow = json(send("/api/follows/" + celeb.id, fan, "{}"));
        assertThat(follow.get("following").asBoolean()).isTrue();

        JsonNode feed = json(get200("/api/posts?mode=recent", fan));
        assertThat(feed).hasSize(1);
        assertThat(feed.get(0).get("content").asText()).isEqualTo("Hello world");

        send("/api/pokes/" + celeb.id, fan, "{}");
        assertThat(json(get200("/api/pokes", celeb))).hasSize(1);
        send("/api/pokes/" + fan.id, celeb, "{}");
        assertThat(json(get200("/api/pokes", celeb))).isEmpty();
        assertThat(json(get200("/api/pokes", fan))).hasSize(1);
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

    private void befriend(Account a, Account b) throws Exception {
        send("/api/friends/request/" + b.id, a, "{}");
        long requestId = json(get200("/api/friends/requests", b)).get(0).get("requestId").asLong();
        send("/api/friends/requests/" + requestId + "/accept", b, "{}");
    }

    private long createPost(Account account, String body) throws Exception {
        return json(send("/api/posts", account, body).andExpect(status().isCreated())).get("id").asLong();
    }

    private ResultActions send(String url, Account account, String body) throws Exception {
        return mockMvc.perform(post(url)
                        .header("Authorization", "Bearer " + account.token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is2xxSuccessful());
    }

    private ResultActions get200(String url, Account account) throws Exception {
        return mockMvc.perform(get(url).header("Authorization", "Bearer " + account.token))
                .andExpect(status().isOk());
    }

    private JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString());
    }
}
