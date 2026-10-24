package com.lighthousefellowship.backend.dto.response;

import com.lighthousefellowship.backend.model.enums.AdminRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class AdminAccountResponseDTO {

    private UUID id;
    private String email;
    private String displayName;
    private AdminRole role;
}
