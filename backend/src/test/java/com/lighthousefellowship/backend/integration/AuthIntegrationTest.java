package com.lighthousefellowship.backend.integration;

import com.lighthousefellowship.backend.config.AdminSeeder;
import com.lighthousefellowship.backend.model.AdminUser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthIntegrationTest extends BaseIntegrationTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Value("${app.jwt.admin-secret}")
    private String adminSecret;

    private MockHttpServletRequestBuilder login(String email, String password) {
        String ip = uniqueIp();
        return post("/api/auth/login")
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}");
    }

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void seededAdminCanLogInWithAnyEmailCasing() throws Exception {
        String body = mockMvc.perform(login("  PASTOR.admin@example.com ", SEED_ADMIN_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.admin.email").value(SEED_ADMIN_EMAIL))
                .andExpect(jsonPath("$.admin.displayName").value("Seed Admin"))
                .andExpect(jsonPath("$.admin.role").value("ADMIN"))
                .andExpect(jsonPath("$.expiresAt").value("2026-09-01T16:00:00Z"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContainIgnoringCase("password");
        String token = jsonMapper.readTree(body).get("token").asString();

        mockMvc.perform(get("/api/admin/account").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(SEED_ADMIN_EMAIL));
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameAnswer() throws Exception {
        String wrongPassword = mockMvc.perform(login(SEED_ADMIN_EMAIL, "not-the-password"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        String unknownEmail = mockMvc.perform(login("nobody@example.com", "not-the-password"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(jsonMapper.readTree(wrongPassword).get("message"))
                .isEqualTo(jsonMapper.readTree(unknownEmail).get("message"));
    }

    @Test
    void loginValidatesTheBody() throws Exception {
        mockMvc.perform(login("", ""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void seederDoesNotOverwriteAnExistingPassword() throws Exception {
        AdminUser admin = seedAdmin();
        String originalHash = admin.getPasswordHash();

        // A restart runs the seeder again; it must leave the account alone.
        new AdminSeeder(adminUserRepository, passwordEncoder, clock,
                SEED_ADMIN_EMAIL, "a-different-seed-password", "Other").run(null);

        assertThat(seedAdmin().getPasswordHash()).isEqualTo(originalHash);
    }

    @Test
    void tamperedTokenIsRejected() throws Exception {
        String token = adminToken();
        String tampered = token.substring(0, token.length() - 4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");

        mockMvc.perform(get("/api/admin/account").header("Authorization", tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenWithTheWrongAudienceIsRejected() throws Exception {
        AdminUser admin = seedAdmin();
        // Signed with the right key, but minted for the visitor audience.
        String visitorAudience = Jwts.builder()
                .issuer("lighthouse-fellowship")
                .audience().add("lighthouse-visitor").and()
                .subject(admin.getId().toString())
                .claim("role", "ADMIN")
                .claim("tv", admin.getTokenVersion())
                .issuedAt(Date.from(clock.instant()))
                .expiration(Date.from(clock.instant().plus(Duration.ofHours(1))))
                .signWith(Keys.hmacShaKeyFor(adminSecret.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/api/admin/account").header("Authorization", "Bearer " + visitorAudience))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        AdminUser admin = seedAdmin();
        String forged = Jwts.builder()
                .issuer("lighthouse-fellowship")
                .audience().add("lighthouse-admin").and()
                .subject(admin.getId().toString())
                .claim("role", "ADMIN")
                .claim("tv", admin.getTokenVersion())
                .expiration(Date.from(clock.instant().plus(Duration.ofHours(1))))
                .signWith(Keys.hmacShaKeyFor("another-key-that-is-long-enough-for-hs256-0123".getBytes(StandardCharsets.UTF_8)))
                .compact();

        mockMvc.perform(get("/api/admin/account").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        String token = adminToken();
        clock.advance(Duration.ofHours(8).plusMinutes(1));

        mockMvc.perform(get("/api/admin/account").header("Authorization", token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anInvalidTokenDoesNotBreakAPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/notes").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isOk());
    }

    @Test
    void passwordChangeInvalidatesOlderTokensAndReturnsANewOne() throws Exception {
        AdminUser admin = createAdmin("original-password-123");
        String oldToken = "Bearer " + jwtService.generateAdminToken(admin).token();

        String body = mockMvc.perform(patch("/api/admin/account/password")
                        .header("Authorization", oldToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"original-password-123\",\"newPassword\":\"a-brand-new-password\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode response = jsonMapper.readTree(body);

        mockMvc.perform(get("/api/admin/account").header("Authorization", oldToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/account").header("Authorization", "Bearer " + response.get("token").asString()))
                .andExpect(status().isOk());
        assertThat(adminUserRepository.findById(admin.getId()).orElseThrow().getTokenVersion()).isEqualTo(1);
        assertThat(passwordEncoder.matches("a-brand-new-password",
                adminUserRepository.findById(admin.getId()).orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    void passwordChangeNeedsTheCurrentPassword() throws Exception {
        AdminUser admin = createAdmin("original-password-123");

        mockMvc.perform(patch("/api/admin/account/password")
                        .header("Authorization", "Bearer " + jwtService.generateAdminToken(admin).token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong-password\",\"newPassword\":\"a-brand-new-password\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));
    }

    @Test
    void passwordChangeRejectsAShortPassword() throws Exception {
        AdminUser admin = createAdmin("original-password-123");

        mockMvc.perform(patch("/api/admin/account/password")
                        .header("Authorization", "Bearer " + jwtService.generateAdminToken(admin).token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"original-password-123\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void responsesCarryARequestId() throws Exception {
        mockMvc.perform(get("/api/notes").header("X-Request-Id", "dashboard-req-0001"))
                .andExpect(header().string("X-Request-Id", "dashboard-req-0001"));
        mockMvc.perform(get("/api/notes").header("X-Request-Id", "bad id\nwith newline"))
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(result -> assertThat(result.getResponse().getHeader("X-Request-Id")).doesNotContain(" "));
    }
}
