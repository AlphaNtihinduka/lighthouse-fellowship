package com.lighthousefellowship.backend.service;

import com.lighthousefellowship.backend.model.AdminUser;
import com.lighthousefellowship.backend.service.support.AdminTokenClaims;
import com.lighthousefellowship.backend.service.support.IssuedToken;

public interface JwtService {

    IssuedToken generateAdminToken(AdminUser adminUser);

    /**
     * @throws io.jsonwebtoken.JwtException if the token is not a valid, unexpired admin
     *         token signed with the admin key
     */
    AdminTokenClaims parseAdminToken(String token);
}
