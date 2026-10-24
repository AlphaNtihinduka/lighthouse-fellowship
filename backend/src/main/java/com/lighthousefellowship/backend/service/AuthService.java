package com.lighthousefellowship.backend.service;

import com.lighthousefellowship.backend.dto.request.ChangePasswordRequestDTO;
import com.lighthousefellowship.backend.dto.request.LoginRequestDTO;
import com.lighthousefellowship.backend.dto.response.AdminAccountResponseDTO;
import com.lighthousefellowship.backend.dto.response.AuthResponseDTO;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;

public interface AuthService {

    AuthResponseDTO login(LoginRequestDTO request);

    AdminAccountResponseDTO getAccount(AdminPrincipal principal);

    AuthResponseDTO changePassword(AdminPrincipal principal, ChangePasswordRequestDTO request);
}
