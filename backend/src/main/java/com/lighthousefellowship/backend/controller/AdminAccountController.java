package com.lighthousefellowship.backend.controller;

import com.lighthousefellowship.backend.dto.request.ChangePasswordRequestDTO;
import com.lighthousefellowship.backend.dto.response.AdminAccountResponseDTO;
import com.lighthousefellowship.backend.dto.response.AuthResponseDTO;
import com.lighthousefellowship.backend.service.AuthService;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// The signed-in admin's own account: used by the dashboard to check its token on
// startup, and for the Account page's password change (PLAN §8).
@RestController
@RequestMapping("/api/admin/account")
@AllArgsConstructor
public class AdminAccountController {

    private final AuthService authService;

    @GetMapping
    public ResponseEntity<AdminAccountResponseDTO> getAccount(@AuthenticationPrincipal AdminPrincipal principal) {
        return ResponseEntity.ok(authService.getAccount(principal));
    }

    @PatchMapping("/password")
    public ResponseEntity<AuthResponseDTO> changePassword(
            @AuthenticationPrincipal AdminPrincipal principal,
            @Valid @RequestBody ChangePasswordRequestDTO request
    ) {
        return ResponseEntity.ok(authService.changePassword(principal, request));
    }
}
