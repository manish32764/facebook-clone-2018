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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Walks the whole authenticated path: register, then use the returned token to
 * create a post, react to it, and read it back from the feed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void protectedEndpointRejectsAnonymousCallers() throws Exception {
        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerThenPostThenReact() throws Exception {
        String token = registerAndGetToken("ada@example.com");

        String created = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hello 2018\",\"privacy\":\"PUBLIC\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Hello 2018"))
                .andExpect(jsonPath("$.reactions.total").value(0))
                .andReturn().getResponse().getContentAsString();

        long postId = objectMapper.readTree(created).get("id").asLong();

        mockMvc.perform(post("/api/posts/" + postId + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reactions.total").value(1))
                .andExpect(jsonPath("$.reactions.myReaction").value("LIKE"));

        // Sending a different reaction switches it rather than adding a second.
        mockMvc.perform(post("/api/posts/" + postId + "/react")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reaction\":\"LOVE\"}"))
                .andExpect(jsonPath("$.reactions.total").value(1))
                .andExpect(jsonPath("$.reactions.myReaction").value("LOVE"));

        // Sending the reaction you already have clears it.
        mockMvc.perform(post("/api/posts/" + postId + "/react")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reaction\":\"LOVE\"}"))
                .andExpect(jsonPath("$.reactions.total").value(0))
                .andExpect(jsonPath("$.reactions.myReaction").doesNotExist());

        String feed = mockMvc.perform(get("/api/posts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode posts = objectMapper.readTree(feed);
        assertThat(posts).hasSize(1);
        assertThat(posts.get(0).get("content").asText()).isEqualTo("Hello 2018");
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        registerAndGetToken("grace@example.com");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registrationBody("grace@example.com")))
                .andExpect(status().isConflict());
    }

    @Test
    void badPasswordIsUnauthorized() throws Exception {
        registerAndGetToken("alan@example.com");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"alan@example.com\",\"password\":\"not-the-one\"}"))
                .andExpect(status().isUnauthorized());
    }

    private String registerAndGetToken(String email) throws Exception {
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registrationBody(email)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("token").asText();
    }

    private String registrationBody(String email) {
        return "{\"firstName\":\"Test\",\"lastName\":\"User\",\"email\":\"" + email
                + "\",\"password\":\"password123\"}";
    }
}
