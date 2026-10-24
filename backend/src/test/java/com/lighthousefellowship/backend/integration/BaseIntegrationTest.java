package com.lighthousefellowship.backend.integration;

import com.lighthousefellowship.backend.model.AdminUser;
import com.lighthousefellowship.backend.model.enums.AdminRole;
import com.lighthousefellowship.backend.repository.AdminUserRepository;
import com.lighthousefellowship.backend.repository.SermonNoteRepository;
import com.lighthousefellowship.backend.service.CoverImageStorageService;
import com.lighthousefellowship.backend.service.JwtService;
import com.lighthousefellowship.backend.support.MutableClock;
import com.lighthousefellowship.backend.support.TestClockConfig;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Every integration test shares one Spring context and one PostgreSQL 17 container,
 * migrated by the real Flyway scripts (never H2: JSONB and CHECK constraints must
 * behave like production). Cloudinary is mocked; the clock is movable.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestClockConfig.class)
public abstract class BaseIntegrationTest {

    // Matches app.admin-seed.* in application-test.properties (stored lowercased).
    protected static final String SEED_ADMIN_EMAIL = "pastor.admin@example.com";
    protected static final String SEED_ADMIN_PASSWORD = "seed-password-for-tests";

    protected static final Instant START = TestClockConfig.START;

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17");

    static {
        POSTGRES.start();
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected MutableClock clock;

    @Autowired
    protected SermonNoteRepository sermonNoteRepository;

    @Autowired
    protected AdminUserRepository adminUserRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected JwtService jwtService;

    @MockitoBean
    protected CoverImageStorageService coverImageStorageService;

    @BeforeEach
    void resetState() {
        clock.setInstant(START);
        sermonNoteRepository.deleteAll();
    }

    protected AdminUser seedAdmin() {
        return adminUserRepository.findByEmail(SEED_ADMIN_EMAIL).orElseThrow();
    }

    protected String adminToken() {
        return "Bearer " + jwtService.generateAdminToken(seedAdmin()).token();
    }

    protected AdminUser createAdmin(String password) {
        AdminUser adminUser = new AdminUser();
        adminUser.setId(UUID.randomUUID());
        adminUser.setEmail("admin-" + UUID.randomUUID() + "@example.com");
        adminUser.setPasswordHash(passwordEncoder.encode(password));
        adminUser.setDisplayName("Test Admin");
        adminUser.setRole(AdminRole.ADMIN);
        adminUser.setTokenVersion(0);
        adminUser.setCreatedAt(START);
        return adminUserRepository.save(adminUser);
    }

    // Rate-limit buckets live as long as the shared context, so each test that logs
    // in uses its own client IP.
    protected static String uniqueIp() {
        int n = NEXT_IP.incrementAndGet();
        return "10." + (n >> 16 & 0xFF) + "." + (n >> 8 & 0xFF) + "." + (n & 0xFF);
    }

    private static final AtomicInteger NEXT_IP = new AtomicInteger();
}
