package com.facebookclone.dto;

import jakarta.validation.constraints.*;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 60) String firstName,
            @NotBlank @Size(max = 60) String lastName,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 6, max = 72) String password,
            String gender,
            String birthDate
    ) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(String token, String tokenType, long expiresIn, UserDto user) {
        public static AuthResponse of(String token, long expiresIn, UserDto user) {
            return new AuthResponse(token, "Bearer", expiresIn, user);
        }
    }
}
