package com.lighthousefellowship.backend.config;

import com.lighthousefellowship.backend.model.AdminUser;
import com.lighthousefellowship.backend.repository.AdminUserRepository;
import com.lighthousefellowship.backend.service.JwtService;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;
import com.lighthousefellowship.backend.service.support.AdminTokenClaims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Turns a valid admin bearer token into an authenticated {@link AdminPrincipal}.
 *
 * The token must be signed with the admin key and carry the admin audience
 * (JwtService.parseAdminToken), and its "tv" claim must match admin_user.token_version,
 * so tokens issued before a password change stop working. The role comes from the
 * database row, never from the token. Phase 5 adds the visitor branch here: a visitor
 * token is checked against its own key/audience and resolved only against the visitor
 * table.
 *
 * An invalid, expired or wrong-audience token is ignored rather than rejected: the
 * request continues unauthenticated, so public endpoints keep working with a stale
 * header, and SecurityConfig returns 401 where a role is required.
 */
@Component
@AllArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AdminUserRepository adminUserRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticate(authHeader.substring(BEARER_PREFIX.length()).strip(), request);
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(String token, HttpServletRequest request) {
        AdminTokenClaims claims;
        try {
            claims = jwtService.parseAdminToken(token);
        } catch (JwtException | IllegalArgumentException exception) {
            log.debug("Ignoring invalid bearer token on {}: {}", request.getRequestURI(), exception.getClass().getSimpleName());
            return;
        }

        Optional<AdminUser> adminUser = adminUserRepository.findById(claims.adminId());
        if (adminUser.isEmpty()) {
            log.debug("Ignoring admin token for a removed account adminId={}", claims.adminId());
            return;
        }
        if (adminUser.get().getTokenVersion() != claims.tokenVersion()) {
            log.debug("Ignoring admin token with a stale token version adminId={}", claims.adminId());
            return;
        }

        AdminPrincipal principal = AdminPrincipal.from(adminUser.get());
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.authorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
