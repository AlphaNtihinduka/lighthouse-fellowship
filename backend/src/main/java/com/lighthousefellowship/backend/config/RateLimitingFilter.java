package com.lighthousefellowship.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limits the endpoints where a guess is cheap for an attacker (rate-limiting-and-abuse-guard):
 * admin login per IP and, independently, per email, so rotating IPs still hits the
 * per-email bucket; and password change per IP. Phase 5 adds the visitor code endpoints.
 * Public note reads are not limited: every phone in church reads on Sunday morning,
 * many of them behind one Wi-Fi IP.
 *
 * In-memory buckets are enough for one container; they reset on restart. This filter
 * is added to the Security chain in SecurityConfig, before authentication, and its
 * servlet-level auto-registration is disabled there so it runs once per request.
 */
@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    static final String LOGIN_PATH = "/api/auth/login";
    static final String CHANGE_PASSWORD_PATH = "/api/admin/account/password";

    static final int LOGIN_IP_CAPACITY = 10;
    static final Duration LOGIN_IP_PERIOD = Duration.ofMinutes(1);
    static final int LOGIN_EMAIL_CAPACITY = 5;
    static final Duration LOGIN_EMAIL_PERIOD = Duration.ofMinutes(15);
    static final int CHANGE_PASSWORD_IP_CAPACITY = 10;
    static final Duration CHANGE_PASSWORD_IP_PERIOD = Duration.ofMinutes(15);

    private final JsonMapper jsonMapper;
    private final boolean trustForwardedHeaders;

    private final Map<String, Bucket> loginIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginEmailBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> changePasswordIpBuckets = new ConcurrentHashMap<>();

    public RateLimitingFilter(
            JsonMapper jsonMapper,
            @Value("${app.rate-limit.trust-forwarded-headers}") boolean trustForwardedHeaders
    ) {
        this.jsonMapper = jsonMapper;
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        boolean isPost = "POST".equalsIgnoreCase(request.getMethod());
        boolean isPatch = "PATCH".equalsIgnoreCase(request.getMethod());
        String path = request.getRequestURI();

        if (isPatch && CHANGE_PASSWORD_PATH.equals(path)) {
            Bucket ipBucket = changePasswordIpBuckets.computeIfAbsent(clientIp(request),
                    key -> newBucket(CHANGE_PASSWORD_IP_CAPACITY, CHANGE_PASSWORD_IP_PERIOD));
            if (!tryConsume(ipBucket, response, path, "ip")) {
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        if (!isPost || !LOGIN_PATH.equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        Bucket ipBucket = loginIpBuckets.computeIfAbsent(clientIp(request),
                key -> newBucket(LOGIN_IP_CAPACITY, LOGIN_IP_PERIOD));
        if (!tryConsume(ipBucket, response, path, "ip")) {
            return;
        }

        CachedBodyRequest cachedRequest = new CachedBodyRequest(request);
        String email = extractEmail(cachedRequest.getCachedBody());
        if (email != null) {
            Bucket emailBucket = loginEmailBuckets.computeIfAbsent(email,
                    key -> newBucket(LOGIN_EMAIL_CAPACITY, LOGIN_EMAIL_PERIOD));
            if (!tryConsume(emailBucket, response, path, "email")) {
                return;
            }
        }

        filterChain.doFilter(cachedRequest, response);
    }

    // Before phase 6 clients connect straight to the container and could forge these
    // headers to pick their own bucket, so they are trusted only once the host Nginx
    // sets them (app.rate-limit.trust-forwarded-headers=true).
    private String clientIp(HttpServletRequest request) {
        if (trustForwardedHeaders) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].strip();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.strip();
            }
        }
        return request.getRemoteAddr();
    }

    private String extractEmail(byte[] body) {
        try {
            JsonNode root = jsonMapper.readTree(body);
            JsonNode emailNode = root == null ? null : root.get("email");
            if (emailNode == null || !emailNode.isString()) {
                return null;
            }
            String email = emailNode.asString().strip().toLowerCase(Locale.ROOT);
            return email.isEmpty() ? null : email;
        } catch (JacksonException exception) {
            // A malformed body becomes a 400 in the controller; there is just no
            // email to key a bucket on.
            return null;
        }
    }

    private static Bucket newBucket(int capacity, Duration period) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(capacity).refillIntervally(capacity, period).build())
                .build();
    }

    // Logs the endpoint and the kind of key, never the key itself (an IP or an email).
    private boolean tryConsume(Bucket bucket, HttpServletResponse response, String path, String keyType)
            throws IOException {
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            return true;
        }

        log.warn("Rate limit tripped path={} key={}", path, keyType);
        long retryAfterSeconds = Math.max(1, Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds());
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Too many attempts. Try again later.\",\"path\":\""
                        + path + "\"}");
        return false;
    }

    // Buffers the body once so the email can be read here and the controller can
    // still bind @RequestBody from it.
    private static final class CachedBodyRequest extends HttpServletRequestWrapper {

        private final byte[] cachedBody;

        CachedBodyRequest(HttpServletRequest request) throws IOException {
            super(request);
            this.cachedBody = request.getInputStream().readAllBytes();
        }

        byte[] getCachedBody() {
            return cachedBody;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream buffer = new ByteArrayInputStream(cachedBody);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return buffer.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    throw new UnsupportedOperationException("Async reads are not used");
                }

                @Override
                public int read() {
                    return buffer.read();
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
