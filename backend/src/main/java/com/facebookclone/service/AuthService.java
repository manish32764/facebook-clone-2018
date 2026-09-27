package com.facebookclone.service;

import com.facebookclone.dto.AuthDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.UserRepository;
import com.facebookclone.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account already exists for " + email);
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(req.password()))
                .firstName(req.firstName().trim())
                .lastName(req.lastName().trim())
                .gender(req.gender())
                .birthDate(parseDate(req.birthDate()))
                .avatarUrl(defaultAvatar(req.firstName(), req.lastName()))
                .coverUrl("https://picsum.photos/seed/cover" + (System.nanoTime() % 1000) + "/851/315")
                .build();

        userRepository.save(user);
        return token(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new BadCredentialsException("bad credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new BadCredentialsException("bad credentials");
        }
        return token(user);
    }

    private AuthResponse token(User user) {
        String jwt = jwtService.generateToken(user.getId(), user.getEmail());
        return AuthResponse.of(jwt, jwtService.getTtlSeconds(), UserDto.from(user));
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw);
        } catch (Exception ex) {
            return null;
        }
    }

    /** ui-avatars keeps new accounts looking like real profiles without shipping binaries. */
    private static String defaultAvatar(String first, String last) {
        return "https://ui-avatars.com/api/?background=4267B2&color=fff&size=200&name="
                + first.trim() + "+" + last.trim();
    }
}
