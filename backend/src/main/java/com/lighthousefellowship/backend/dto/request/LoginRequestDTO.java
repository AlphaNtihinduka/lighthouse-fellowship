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
public class LoginRequestDTO {

    @NotBlank
    @Size(max = 254)
    private String email;

    @ToString.Exclude
    @NotBlank
    @Size(max = 200)
    private String password;
}
