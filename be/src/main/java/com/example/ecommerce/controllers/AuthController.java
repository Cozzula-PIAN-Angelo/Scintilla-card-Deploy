package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.LoginDTO;
import com.example.ecommerce.payloads.LoginResponseDTO;
import com.example.ecommerce.payloads.RegistrazioneDTO;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.services.AuthService;
import com.example.ecommerce.services.UtenteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UtenteService utenteService;
    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UtenteResponseDTO register(@RequestBody @Valid RegistrazioneDTO body) {
        return utenteService.registra(body);
    }

    @PostMapping("/login")
    public LoginResponseDTO login(@RequestBody @Valid LoginDTO body) {
        return authService.login(body);
    }

    // endpoint autenticato: il JWTFilter ha già verificato che l'header sia "Bearer <token>" valido
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        authService.logout(authorization.substring("Bearer ".length()).trim());
    }
}
