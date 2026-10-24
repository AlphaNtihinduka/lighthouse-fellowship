package com.lighthousefellowship.backend.integration;

import com.lighthousefellowship.backend.service.support.StoredImage;
import com.lighthousefellowship.backend.support.JsonFixtureLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminSermonNoteIntegrationTest extends BaseIntegrationTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    private static final String KILLING_GIANTS = JsonFixtureLoader.load("fixtures/notes/killing-giants.json");

    private static String noteJson(String sermonDate, String blocksJson) {
        return "{\"title\":\"Test note\",\"sermonDate\":\"" + sermonDate + "\",\"blocks\":" + blocksJson + "}";
    }

    private String createNote(String json) throws Exception {
        String body = mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return jsonMapper.readTree(body).get("id").asString();
    }

    // ---- Role matrix: every admin endpoint refuses an anonymous caller ----

    static Stream<Arguments> adminEndpoints() {
        String id = UUID.randomUUID().toString();
        return Stream.of(
                Arguments.of(HttpMethod.GET, "/api/admin/notes"),
                Arguments.of(HttpMethod.GET, "/api/admin/notes/" + id),
                Arguments.of(HttpMethod.POST, "/api/admin/notes"),
                Arguments.of(HttpMethod.PUT, "/api/admin/notes/" + id),
                Arguments.of(HttpMethod.DELETE, "/api/admin/notes/" + id),
                Arguments.of(HttpMethod.POST, "/api/admin/notes/" + id + "/cover-image"),
                Arguments.of(HttpMethod.PATCH, "/api/admin/notes/" + id + "/publish"),
                Arguments.of(HttpMethod.PATCH, "/api/admin/notes/" + id + "/unpublish"),
                Arguments.of(HttpMethod.GET, "/api/admin/account"),
                Arguments.of(HttpMethod.PATCH, "/api/admin/account/password")
        );
    }

    @ParameterizedTest
    @MethodSource("adminEndpoints")
    void anonymousCallersGet401(HttpMethod method, String path) throws Exception {
        mockMvc.perform(request(method, path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownPathsAreDeniedNotOpen() throws Exception {
        mockMvc.perform(get("/api/me/attempts")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/something-else").header("Authorization", adminToken()))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/notes").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void actuatorOnlyExposesHealth() throws Exception {
        mockMvc.perform(get("/actuator/env").header("Authorization", adminToken()))
                .andExpect(status().isForbidden());
    }

    // ---- CRUD ----

    @Test
    void createReadUpdateDelete() throws Exception {
        String id = createNote(KILLING_GIANTS);

        mockMvc.perform(get("/api/admin/notes/" + id).header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Killing Giants"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.contentVersion").value(1))
                .andExpect(jsonPath("$.blocks.length()").value(3))
                .andExpect(jsonPath("$.blocks[1].segments[7].answer").value("defeat them"))
                .andExpect(jsonPath("$.coverImagePublicId").doesNotExist())
                .andExpect(jsonPath("$.createdBy").doesNotExist());

        String updated = KILLING_GIANTS.replace("\"Killing Giants\"", "\"Killing Giants!\"");
        mockMvc.perform(put("/api/admin/notes/" + id)
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updated))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Killing Giants!"))
                .andExpect(jsonPath("$.contentVersion").value(2));

        mockMvc.perform(delete("/api/admin/notes/" + id).header("Authorization", adminToken()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/admin/notes/" + id).header("Authorization", adminToken()))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRecordsTheAdmin() throws Exception {
        String id = createNote(KILLING_GIANTS);
        assertThat(sermonNoteRepository.findById(UUID.fromString(id)).orElseThrow().getCreatedBy())
                .isEqualTo(seedAdmin().getId());
    }

    @Test
    void listFiltersByYearAndMonth() throws Exception {
        createNote(noteJson("2026-09-13", "[]"));
        createNote(noteJson("2026-09-20", "[]"));
        createNote(noteJson("2026-10-18", "[]"));
        createNote(noteJson("2025-12-28", "[]"));

        mockMvc.perform(get("/api/admin/notes").param("year", "2026").param("month", "9")
                        .header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].sermonDate").value("2026-09-20"))
                .andExpect(jsonPath("$[0].blocks").doesNotExist());
        mockMvc.perform(get("/api/admin/notes").param("year", "2026").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.length()").value(3));
        mockMvc.perform(get("/api/admin/notes").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.length()").value(4));
        mockMvc.perform(get("/api/admin/notes").param("month", "9").header("Authorization", adminToken()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sermonDateMustBeASunday() throws Exception {
        mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson("2026-09-14", "[]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("sermonDate must be a Sunday: 2026-09-14 is a MONDAY"));
    }

    @Test
    void oneNotePerSunday() throws Exception {
        createNote(noteJson("2026-09-13", "[]"));
        mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson("2026-09-13", "[]")))
                .andExpect(status().isConflict());

        String other = createNote(noteJson("2026-09-20", "[]"));
        mockMvc.perform(put("/api/admin/notes/" + other)
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson("2026-09-13", "[]")))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidContentIsRejectedWithTheBlockNamed() throws Exception {
        String fourWords = "[{\"id\":\"p1\",\"type\":\"PARAGRAPH\",\"segments\":[{\"blankId\":\"k1\",\"answer\":\"one two three four\"}]}]";
        mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson("2026-09-13", fourWords)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Block 1 (p1) PARAGRAPH")));
        assertThat(sermonNoteRepository.count()).isZero();
    }

    @Test
    void unknownFieldsAndBlockTypesAreRejected() throws Exception {
        String unknownField = "[{\"id\":\"r1\",\"type\":\"REFLECTION\",\"prompt\":\"?\",\"color\":\"red\"}]";
        mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson("2026-09-13", unknownField)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unknown field: blocks[0].color"));

        String unknownType = "[{\"id\":\"v1\",\"type\":\"VIDEO\"}]";
        mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson("2026-09-13", unknownType)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("blocks[0].type: invalid value"));
    }

    @Test
    void missingTitleIsRejected() throws Exception {
        mockMvc.perform(post("/api/admin/notes")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sermonDate\":\"2026-09-13\",\"blocks\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(startsWith("title:")));
    }

    @Test
    void invalidIdIsABadRequest() throws Exception {
        mockMvc.perform(get("/api/admin/notes/not-a-uuid").header("Authorization", adminToken()))
                .andExpect(status().isBadRequest());
    }

    // ---- Publish ----

    @Test
    void publishScheduleAndUnpublish() throws Exception {
        String id = createNote(KILLING_GIANTS);

        mockMvc.perform(patch("/api/admin/notes/" + id + "/publish")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"publishAt\":\"2026-09-13T07:00:00Z\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.publishAt").value("2026-09-13T07:00:00Z"));

        mockMvc.perform(patch("/api/admin/notes/" + id + "/publish").header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.publishAt").value(START.toString()));

        mockMvc.perform(patch("/api/admin/notes/" + id + "/unpublish").header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.publishAt").doesNotExist());
    }

    @Test
    void anEmptyNoteCannotBePublished() throws Exception {
        String id = createNote(noteJson("2026-09-13", "[]"));
        mockMvc.perform(patch("/api/admin/notes/" + id + "/publish").header("Authorization", adminToken()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publishingAMissingNoteIs404() throws Exception {
        mockMvc.perform(patch("/api/admin/notes/" + UUID.randomUUID() + "/publish").header("Authorization", adminToken()))
                .andExpect(status().isNotFound());
    }

    // ---- Cover image ----

    @Test
    void coverUploadStoresTheUrlAndReplacesTheOldImage() throws Exception {
        String id = createNote(KILLING_GIANTS);
        when(coverImageStorageService.upload(any(), eq(UUID.fromString(id))))
                .thenReturn(new StoredImage("https://res.cloudinary.com/demo/first.png", "covers/first"))
                .thenReturn(new StoredImage("https://res.cloudinary.com/demo/second.png", "covers/second"));

        MockMultipartFile file = new MockMultipartFile("file", "cover.png", "image/png", PNG);
        mockMvc.perform(multipart("/api/admin/notes/" + id + "/cover-image").file(file)
                        .header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverImageUrl").value("https://res.cloudinary.com/demo/first.png"))
                .andExpect(jsonPath("$.contentVersion").value(2));

        mockMvc.perform(multipart("/api/admin/notes/" + id + "/cover-image").file(file)
                        .header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coverImageUrl").value("https://res.cloudinary.com/demo/second.png"));
        verify(coverImageStorageService).delete("covers/first");

        mockMvc.perform(delete("/api/admin/notes/" + id).header("Authorization", adminToken()))
                .andExpect(status().isNoContent());
        verify(coverImageStorageService).delete("covers/second");
    }

    @Test
    void coverUploadRejectsAFileThatIsNotAnImage() throws Exception {
        String id = createNote(KILLING_GIANTS);
        MockMultipartFile fake = new MockMultipartFile("file", "cover.png", "image/png", "<html>".getBytes());

        mockMvc.perform(multipart("/api/admin/notes/" + id + "/cover-image").file(fake)
                        .header("Authorization", adminToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The cover image must be a JPEG, PNG or WebP file"));
        verify(coverImageStorageService, never()).upload(any(), any());
    }

    @Test
    void coverUploadForAMissingNoteDoesNotUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "cover.png", "image/png", PNG);
        mockMvc.perform(multipart("/api/admin/notes/" + UUID.randomUUID() + "/cover-image").file(file)
                        .header("Authorization", adminToken()))
                .andExpect(status().isNotFound());
        verify(coverImageStorageService, never()).upload(any(), any());
    }
}
