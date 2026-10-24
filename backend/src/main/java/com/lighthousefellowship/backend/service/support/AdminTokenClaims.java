package com.lighthousefellowship.backend.service.support;

import java.util.UUID;

// What JwtService.parseAdminToken vouches for after checking signature, expiry,
// issuer and audience. The filter still compares tokenVersion with the database.
public record AdminTokenClaims(UUID adminId, int tokenVersion) {
}
