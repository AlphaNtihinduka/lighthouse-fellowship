package com.lighthousefellowship.backend.service.support;

import com.lighthousefellowship.backend.model.AdminUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

// The authenticated caller on /api/admin/**, built by JwtAuthenticationFilter from
// the admin_user row (not from token claims), so the role always reflects the
// database. Phase 5 adds a separate VisitorPrincipal; the two are never interchangeable.
public record AdminPrincipal(UUID id, String email, String displayName, List<GrantedAuthority> authorities) {

    public static AdminPrincipal from(AdminUser adminUser) {
        return new AdminPrincipal(
                adminUser.getId(),
                adminUser.getEmail(),
                adminUser.getDisplayName(),
                List.of(new SimpleGrantedAuthority("ROLE_" + adminUser.getRole().name()))
        );
    }
}
