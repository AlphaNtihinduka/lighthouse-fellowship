package com.lighthousefellowship.backend.integration;

import com.lighthousefellowship.backend.support.JsonFixtureLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The most important property of the public API: a draft or scheduled note never
// leaves the server through it, in the list, in /latest, or by id.
class PublicSermonNoteIntegrationTest extends BaseIntegrationTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    private String createNote(String json) throws Exception {
        String body = mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(body).get("id").asString();
    }

    private void publish(String id, Instant publishAt) throws Exception {
        mockMvc.perform(patch("/api/admin/notes/" + id + "/publish")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"publishAt\":\"" + publishAt + "\"}"))
                .andExpect(status().isOk());
    }

    private static String fixture(String name) {
        return JsonFixtureLoader.load("fixtures/notes/" + name + ".json");
    }

    @Test
    void draftsAndScheduledNotesAreInvisibleUntilTheirTime() throws Exception {
        String published = createNote(fixture("killing-giants"));
        publish(published, START.minus(Duration.ofDays(1)));
        String draft = createNote(fixture("seeing-jesus-in-david"));
        String scheduled = createNote(fixture("jesus-is-in-the-boat"));
        Instant sundayMorning = Instant.parse("2026-10-18T07:00:00Z");
        publish(scheduled, sundayMorning);

        mockMvc.perform(get("/api/notes").param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(published));
        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/notes/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(published));
        mockMvc.perform(get("/api/notes/" + draft)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/notes/" + scheduled)).andExpect(status().isNotFound());

        // One second before: still hidden. At publish_at: visible everywhere.
        clock.setInstant(sundayMorning.minusSeconds(1));
        mockMvc.perform(get("/api/notes/" + scheduled)).andExpect(status().isNotFound());

        clock.setInstant(sundayMorning);
        mockMvc.perform(get("/api/notes/" + scheduled)).andExpect(status().isOk());
        mockMvc.perform(get("/api/notes/latest")).andExpect(jsonPath("$.id").value(scheduled));
        mockMvc.perform(get("/api/notes").param("year", "2026"))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(scheduled));

        // The draft never appears, however far the clock moves.
        clock.advance(Duration.ofDays(3650));
        mockMvc.perform(get("/api/notes/" + draft)).andExpect(status().isNotFound());
    }

    @Test
    void unpublishingHidesANoteAgain() throws Exception {
        String id = createNote(fixture("killing-giants"));
        publish(id, START);
        mockMvc.perform(get("/api/notes/" + id)).andExpect(status().isOk());

        mockMvc.perform(patch("/api/admin/notes/" + id + "/unpublish").header("Authorization", adminToken()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notes/" + id)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/notes/latest")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/notes")).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void missingAndUnpublishedNotesLookTheSame() throws Exception {
        String draft = createNote(fixture("killing-giants"));

        JsonNode unpublished = jsonMapper.readTree(mockMvc.perform(get("/api/notes/" + draft))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString());
        String randomId = UUID.randomUUID().toString();
        JsonNode missing = jsonMapper.readTree(mockMvc.perform(get("/api/notes/" + randomId))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString());

        assertThat(unpublished.get("message").asString().replace(draft, "ID"))
                .isEqualTo(missing.get("message").asString().replace(randomId, "ID"));
    }

    @Test
    void latestIsNotFoundBeforeAnythingIsPublished() throws Exception {
        createNote(fixture("killing-giants"));
        mockMvc.perform(get("/api/notes/latest")).andExpect(status().isNotFound());
    }

    @Test
    void publicResponsesCarryAnswersButNoAdminFields() throws Exception {
        String id = createNote(fixture("killing-giants"));
        publish(id, START);

        mockMvc.perform(get("/api/notes/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocks[1].segments[1].answer").value("if"))
                .andExpect(jsonPath("$.preacherName").value("Pastor Joe Benecasa"))
                .andExpect(jsonPath("$.contentVersion").value(1))
                .andExpect(jsonPath("$.publishAt").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.createdBy").doesNotExist())
                .andExpect(jsonPath("$.coverImagePublicId").doesNotExist())
                .andExpect(jsonPath("$.createdAt").doesNotExist());

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].title").value("Killing Giants"))
                .andExpect(jsonPath("$[0].sermonDate").value("2026-09-13"))
                .andExpect(jsonPath("$[0].contentVersion").value(1))
                .andExpect(jsonPath("$[0].blocks").doesNotExist())
                .andExpect(jsonPath("$[0].publishAt").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"killing-giants", "seeing-jesus-in-david", "jesus-is-in-the-boat"})
    void sampleNotesRoundTripUnchanged(String name) throws Exception {
        String json = fixture(name);
        String id = createNote(json);
        publish(id, START);

        JsonNode sent = jsonMapper.readTree(json);
        JsonNode served = jsonMapper.readTree(mockMvc.perform(get("/api/notes/" + id))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());

        assertThat(served.get("blocks")).isEqualTo(sent.get("blocks"));
        assertThat(served.get("title")).isEqualTo(sent.get("title"));
        assertThat(served.get("preacherName")).isEqualTo(sent.get("preacherName"));
        assertThat(served.get("sermonDate")).isEqualTo(sent.get("sermonDate"));
    }

    @Test
    void publicReadsSupportEtagRevalidation() throws Exception {
        String id = createNote(fixture("killing-giants"));
        publish(id, START);

        String etag = mockMvc.perform(get("/api/notes/" + id))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andReturn().getResponse().getHeader("ETag");
        assertThat(etag).isNotBlank();

        mockMvc.perform(get("/api/notes/" + id).header("If-None-Match", etag))
                .andExpect(status().isNotModified());
    }

    @Test
    void anInvalidYearIsABadRequest() throws Exception {
        mockMvc.perform(get("/api/notes").param("year", "1800")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/notes").param("year", "abc")).andExpect(status().isBadRequest());
    }

    @Test
    void anAdminTokenReadsTheSamePublishedNotes() throws Exception {
        createNote(fixture("killing-giants"));
        mockMvc.perform(get("/api/notes").header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
