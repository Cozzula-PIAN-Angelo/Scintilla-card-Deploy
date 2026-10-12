package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.payloads.LoginDTO;
import com.example.ecommerce.repositories.UtenteRepository;
import com.example.ecommerce.security.JWTTools;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UtenteRepository utenteRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JWTTools jwtTools;
    @Mock
    private TokenRevocatoService tokenRevocatoService;

    @InjectMocks
    private AuthService service;

    // come per l'email: "MARIO" e "mario" al login sono lo stesso username
    @Test
    void loginPerUsernameIgnoraLeMaiuscole() {
        Utente mario = new Utente("Mario", "mario@esempio.it", "hash");
        when(utenteRepository.findByUsernameIgnoreCase("MARIO")).thenReturn(List.of(mario));
        when(passwordEncoder.matches("password123", "hash")).thenReturn(true);
        when(jwtTools.generaToken(same(mario))).thenReturn("token-di-mario");

        assertThat(service.login(new LoginDTO("MARIO", "password123")).token()).isEqualTo("token-di-mario");
    }

    // account vecchi registrati prima della regola: due username uguali a meno delle maiuscole.
    // Vale quello scritto esattamente
    @Test
    void conDueUsernameVecchiValeQuelloScrittoEsattamente() {
        Utente maiuscolo = new Utente("Mario", "a@esempio.it", "hash-a");
        Utente minuscolo = new Utente("mario", "b@esempio.it", "hash-b");
        when(utenteRepository.findByUsernameIgnoreCase("mario")).thenReturn(List.of(maiuscolo, minuscolo));
        when(passwordEncoder.matches(anyString(), eq("hash-b"))).thenReturn(true);
        when(jwtTools.generaToken(same(minuscolo))).thenReturn("token-b");

        assertThat(service.login(new LoginDTO("mario", "password123")).token()).isEqualTo("token-b");
    }
}
