package com.lighthousefellowship.backend.service.impl;

import com.lighthousefellowship.backend.model.AdminUser;
import com.lighthousefellowship.backend.service.JwtService;
import com.lighthousefellowship.backend.service.support.AdminTokenClaims;
import com.lighthousefellowship.backend.service.support.IssuedToken;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Set;
import java.util.UUID;

/**
 * Admin tokens are signed with their own key and audience (lighthouse-auth-guardrails).
 * Visitor tokens arrive in phase 5 with a separate key, so a leaked visitor key can
 * never mint an admin token.
 */
@Service
public class JwtServiceImpl implements JwtService {

    static final String ISSUER = "lighthouse-fellowship";
    static final String ADMIN_AUDIENCE = "lighthouse-admin";
    static final String TOKEN_VERSION_CLAIM = "tv";
    static final String ROLE_CLAIM = "role";

    // HS256 needs at least a 256-bit key.
    private static final int MIN_SECRET_BYTES = 32;
    private static final Set<String> KNOWN_PLACEHOLDERS = Set.of(
            "replace_with_secure_jwt_secret",
            "replace_with_secure_admin_jwt_secret"
    );

    private final SecretKey adminKey;
    private final Duration adminTokenLifetime;
    private final Clock clock;

    public JwtServiceImpl(
            @Value("${app.jwt.admin-secret}") String adminSecret,
            @Value("${app.jwt.admin-expiration-ms}") long adminExpirationMs,
            Clock clock
    ) {
        this.adminKey = Keys.hmacShaKeyFor(requireSecureSecret(adminSecret).getBytes(StandardCharsets.UTF_8));
        this.adminTokenLifetime = Duration.ofMillis(adminExpirationMs);
        this.clock = clock;
    }

    // Fail at startup rather than run production on a missing or known secret.
    private static String requireSecureSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_ADMIN_SECRET is not set. Refusing to start without a signing key.");
        }
        if (KNOWN_PLACEHOLDERS.contains(secret)) {
            throw new IllegalStateException(
                    "JWT_ADMIN_SECRET is still the placeholder from .env.example. Generate one with `openssl rand -base64 48`.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_ADMIN_SECRET is too short for HS256 (needs at least " + MIN_SECRET_BYTES + " bytes).");
        }
        return secret;
    }

    @Override
    public IssuedToken generateAdminToken(AdminUser adminUser) {
        Instant now = Instant.now(clock);
        Instant expiresAt = now.plus(adminTokenLifetime);

        String token = Jwts.builder()
                .issuer(ISSUER)
                .audience().add(ADMIN_AUDIENCE).and()
                .subject(adminUser.getId().toString())
                .claim(ROLE_CLAIM, adminUser.getRole().name())
                .claim(TOKEN_VERSION_CLAIM, adminUser.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(adminKey, Jwts.SIG.HS256)
                .compact();

        return new IssuedToken(token, expiresAt);
    }

    @Override
    public AdminTokenClaims parseAdminToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(adminKey)
                .requireIssuer(ISSUER)
                .requireAudience(ADMIN_AUDIENCE)
                .clock(() -> Date.from(Instant.now(clock)))
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Integer tokenVersion = claims.get(TOKEN_VERSION_CLAIM, Integer.class);
        if (claims.getSubject() == null || tokenVersion == null) {
            throw new JwtException("Admin token is missing its subject or token version");
        }
        return new AdminTokenClaims(UUID.fromString(claims.getSubject()), tokenVersion);
    }
}
