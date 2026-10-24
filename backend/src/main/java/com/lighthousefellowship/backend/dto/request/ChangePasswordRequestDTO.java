package com.lighthousefellowship.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ChangePasswordRequestDTO {

    @ToString.Exclude
    @NotBlank
    @Size(max = 200)
    private String currentPassword;

    // BCrypt ignores everything after 72 bytes, so longer passwords are refused
    // rather than silently truncated.
    @ToString.Exclude
    @NotBlank
    @Size(min = 12, max = 72)
    private String newPassword;
}
