package com.lighthousefellowship.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class AuthResponseDTO {

    private String token;
    private String tokenType;
    private Instant expiresAt;
    private AdminAccountResponseDTO admin;
}
