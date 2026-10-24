package com.lighthousefellowship.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RateLimitingIntegrationTest extends BaseIntegrationTest {

    private static MockHttpServletRequestBuilder login(String ip, String email) {
        return post("/api/auth/login")
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}");
    }

    @Test
    void loginIsLimitedPerIpToTenPerMinute() throws Exception {
        String ip = uniqueIp();
        for (int i = 0; i < 10; i++) {
            // A different email each time, so only the IP bucket is in play.
            mockMvc.perform(login(ip, "user" + i + "-" + UUID.randomUUID() + "@example.com"))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(login(ip, "another@example.com"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void loginIsLimitedPerEmailToFiveEvenAcrossIps() throws Exception {
        String email = "target-" + UUID.randomUUID() + "@example.com";
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(login(uniqueIp(), email)).andExpect(status().isUnauthorized());
        }
        // Same address with different casing and spacing is the same bucket.
        mockMvc.perform(login(uniqueIp(), " " + email.toUpperCase() + " "))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void forwardedHeadersAreIgnoredBeforeTheProxyExists() throws Exception {
        String ip = uniqueIp();
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(login(ip, "fwd" + i + "-" + UUID.randomUUID() + "@example.com")
                            .header("X-Forwarded-For", "203.0.113." + i))
                    .andExpect(status().isUnauthorized());
        }
        // Rotating a forged X-Forwarded-For does not buy a fresh bucket.
        mockMvc.perform(login(ip, "fwd-last@example.com").header("X-Forwarded-For", "203.0.113.99"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void publicNoteReadsAreNotLimited() throws Exception {
        String ip = uniqueIp();
        for (int i = 0; i < 30; i++) {
            mockMvc.perform(get("/api/notes").with(request -> {
                request.setRemoteAddr(ip);
                return request;
            })).andExpect(status().isOk());
        }
    }
}
