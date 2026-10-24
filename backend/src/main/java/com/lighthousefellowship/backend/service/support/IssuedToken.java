package com.lighthousefellowship.backend.service.support;

import java.time.Instant;

public record IssuedToken(String token, Instant expiresAt) {
}
