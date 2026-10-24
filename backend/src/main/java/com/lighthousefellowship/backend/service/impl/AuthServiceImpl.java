package com.lighthousefellowship.backend.service.impl;

import com.lighthousefellowship.backend.dto.request.ChangePasswordRequestDTO;
import com.lighthousefellowship.backend.dto.request.LoginRequestDTO;
import com.lighthousefellowship.backend.dto.response.AdminAccountResponseDTO;
import com.lighthousefellowship.backend.dto.response.AuthResponseDTO;
import com.lighthousefellowship.backend.exception.IncorrectPasswordException;
import com.lighthousefellowship.backend.exception.InvalidCredentialsException;
import com.lighthousefellowship.backend.mapper.AdminUserMapper;
import com.lighthousefellowship.backend.model.AdminUser;
import com.lighthousefellowship.backend.repository.AdminUserRepository;
import com.lighthousefellowship.backend.service.AuthService;
import com.lighthousefellowship.backend.service.JwtService;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;
import com.lighthousefellowship.backend.service.support.EmailMasker;
import com.lighthousefellowship.backend.service.support.IssuedToken;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AdminUserMapper adminUserMapper;

    // Checked against when the email is unknown, so an unknown email costs the same
    // BCrypt time as a wrong password and response timing does not reveal which
    // admin emails exist.
    private final String dummyPasswordHash;

    public AuthServiceImpl(
            AdminUserRepository adminUserRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AdminUserMapper adminUserMapper
    ) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.adminUserMapper = adminUserMapper;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponseDTO login(LoginRequestDTO request) {
        Optional<AdminUser> adminUser = adminUserRepository.findByEmail(normalizeEmail(request.getEmail()));

        String hash = adminUser.map(AdminUser::getPasswordHash).orElse(dummyPasswordHash);
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), hash);

        if (adminUser.isEmpty() || !passwordMatches) {
            log.info("Admin login failed for {}", EmailMasker.mask(request.getEmail()));
            throw new InvalidCredentialsException();
        }

        log.info("Admin login succeeded adminId={}", adminUser.get().getId());
        return authResponse(adminUser.get());
    }

    @Override
    @Transactional(readOnly = true)
    public AdminAccountResponseDTO getAccount(AdminPrincipal principal) {
        return adminUserMapper.toAccountResponse(loadAdmin(principal));
    }

    // Bumping token_version signs out every other session of this admin; the
    // caller gets a fresh token so the dashboard stays signed in.
    @Override
    @Transactional
    public AuthResponseDTO changePassword(AdminPrincipal principal, ChangePasswordRequestDTO request) {
        AdminUser adminUser = loadAdmin(principal);

        if (!passwordEncoder.matches(request.getCurrentPassword(), adminUser.getPasswordHash())) {
            log.info("Admin password change refused (wrong current password) adminId={}", adminUser.getId());
            throw new IncorrectPasswordException();
        }

        adminUser.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        adminUser.setTokenVersion(adminUser.getTokenVersion() + 1);
        AdminUser saved = adminUserRepository.save(adminUser);

        log.info("Admin password changed adminId={}", saved.getId());
        return authResponse(saved);
    }

    // The filter already loaded this admin for the request; loading again inside the
    // transaction keeps the write path simple. A missing row means the account was
    // removed mid-request.
    private AdminUser loadAdmin(AdminPrincipal principal) {
        return adminUserRepository.findById(principal.id()).orElseThrow(InvalidCredentialsException::new);
    }

    private AuthResponseDTO authResponse(AdminUser adminUser) {
        IssuedToken token = jwtService.generateAdminToken(adminUser);
        return new AuthResponseDTO(
                token.token(),
                "Bearer",
                token.expiresAt(),
                adminUserMapper.toAccountResponse(adminUser)
        );
    }
}
