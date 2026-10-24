package com.lighthousefellowship.backend.model;

import com.lighthousefellowship.backend.model.enums.AdminRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_user")
@AllArgsConstructor
@NoArgsConstructor
@Data
public class AdminUser {

    @Id
    private UUID id;

    // Always stored lowercased and trimmed (see AuthServiceImpl.normalizeEmail).
    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @ToString.Exclude
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 120)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdminRole role;

    @Column(nullable = false)
    private int tokenVersion;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
