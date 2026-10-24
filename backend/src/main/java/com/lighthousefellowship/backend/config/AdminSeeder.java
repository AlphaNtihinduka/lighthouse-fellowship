package com.lighthousefellowship.backend.config;

import com.lighthousefellowship.backend.model.AdminUser;
import com.lighthousefellowship.backend.model.enums.AdminRole;
import com.lighthousefellowship.backend.repository.AdminUserRepository;
import com.lighthousefellowship.backend.service.impl.AuthServiceImpl;
import com.lighthousefellowship.backend.service.support.EmailMasker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * There is no admin self-registration. The first admin comes from ADMIN_SEED_EMAIL,
 * ADMIN_SEED_PASSWORD and ADMIN_SEED_DISPLAY_NAME on startup. It is created only if no
 * admin with that email exists and an existing password is never overwritten, so the
 * seed values can stay in .env after the admin changes their password. Missing values
 * mean no seeding (with a warning), not a crash. The password is never logged.
 */
@Component
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private static final int MIN_PASSWORD_LENGTH = 12;
    private static final int MAX_PASSWORD_BYTES = 72;

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final String email;
    private final String password;
    private final String displayName;

    public AdminSeeder(
            AdminUserRepository adminUserRepository,
            PasswordEncoder passwordEncoder,
            Clock clock,
            @Value("${app.admin-seed.email:}") String email,
            @Value("${app.admin-seed.password:}") String password,
            @Value("${app.admin-seed.display-name:}") String displayName
    ) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.email = AuthServiceImpl.normalizeEmail(email);
        this.password = password;
        this.displayName = displayName == null ? "" : displayName.strip();
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
            log.warn("ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not set: no admin seeded");
            return;
        }
        if (adminUserRepository.existsByEmail(email)) {
            log.info("Seed admin {} already exists; leaving it unchanged", EmailMasker.mask(email));
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH || password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            log.warn("ADMIN_SEED_PASSWORD must be {} to {} bytes long: no admin seeded", MIN_PASSWORD_LENGTH, MAX_PASSWORD_BYTES);
            return;
        }

        AdminUser adminUser = new AdminUser();
        adminUser.setId(UUID.randomUUID());
        adminUser.setEmail(email);
        adminUser.setPasswordHash(passwordEncoder.encode(password));
        adminUser.setDisplayName(displayName.isEmpty() ? "Admin" : displayName);
        adminUser.setRole(AdminRole.ADMIN);
        adminUser.setTokenVersion(0);
        adminUser.setCreatedAt(Instant.now(clock));
        adminUserRepository.save(adminUser);

        log.info("Seeded admin {} adminId={}", EmailMasker.mask(email), adminUser.getId());
    }
}
