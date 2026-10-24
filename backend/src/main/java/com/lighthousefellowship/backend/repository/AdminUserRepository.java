package com.lighthousefellowship.backend.repository;

import com.lighthousefellowship.backend.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminUserRepository extends JpaRepository<AdminUser, UUID> {

    Optional<AdminUser> findByEmail(String email);

    boolean existsByEmail(String email);
}
