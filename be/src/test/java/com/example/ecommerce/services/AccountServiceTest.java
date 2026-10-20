package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import com.example.ecommerce.payloads.CambioPasswordDTO;
import com.example.ecommerce.payloads.LoginResponseDTO;
import com.example.ecommerce.payloads.ModificaAccountDTO;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.repositories.UtenteRepository;
import com.example.ecommerce.security.JWTTools;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AccountServiceTest {

    private static final String IP = "1.1.1.1";

    @Mock
    private UtenteRepository utenteRepository;
    @Mock
    private UtenteService utenteService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private LimitatoreLogin limitatoreLogin;
    @Mock
    private JWTTools jwtTools;

    private AccountService service;
    private Utente utente;
    private UUID id;

    @BeforeEach
    void prepara() {
        service = new AccountService(utenteRepository, utenteService, passwordEncoder, limitatoreLogin, jwtTools);
        id = UUID.randomUUID();
        utente = new Utente("mario", "mario@esempio.it", "hash-vecchio");
        ReflectionTestUtils.setField(utente, "id", id);
        when(utenteRepository.findById(id)).thenReturn(Optional.of(utente));
        when(utenteRepository.save(any(Utente.class))).thenAnswer(invocazione -> invocazione.getArgument(0));
        when(passwordEncoder.matches("giusta123", "hash-vecchio")).thenReturn(true);
        when(utenteRepository.findByUsernameIgnoreCase(anyString())).thenReturn(List.of());
        when(utenteRepository.findByEmailIgnoreCase(anyString())).thenReturn(List.of());
        when(utenteService.getProfilo(any(Utente.class))).thenAnswer(invocazione -> {
            Utente u = invocazione.getArgument(0);
            return new UtenteResponseDTO(u.getId(), u.getUsername(), u.getEmail(), List.of("UTENTE"), null);
        });
    }

    @Test
    void passwordAttualeSbagliata() {
        assertThatThrownBy(() -> service.modifica(utente, new ModificaAccountDTO("luigi", "mario@esempio.it", "sbagliata"), IP))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Password errata");

        verify(limitatoreLogin).fallito(IP, "mario@esempio.it");
        verify(utenteRepository, never()).save(any());
    }

    @Test
    void oltreIlLimiteNonControllaLaPassword() {
        doThrow(new TroppeRichiesteException("Troppi tentativi")).when(limitatoreLogin).controlla(IP, "mario@esempio.it");

        assertThatThrownBy(() -> service.cambiaPassword(utente, new CambioPasswordDTO("giusta123", "nuovissima1"), IP))
                .isInstanceOf(TroppeRichiesteException.class);
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    // "mario" -> "Mario" è sempre il proprio username, non un conflitto
    @Test
    void cambioUsernameSoloMaiuscole() {
        when(utenteRepository.findByUsernameIgnoreCase("Mario")).thenReturn(List.of(utente));

        UtenteResponseDTO risposta = service.modifica(utente, new ModificaAccountDTO("Mario", "mario@esempio.it", "giusta123"), IP);

        assertThat(utente.getUsername()).isEqualTo("Mario");
        assertThat(risposta.username()).isEqualTo("Mario");
    }

    @Test
    void usernameDiUnAltro() {
        Utente luigi = new Utente("Luigi", "luigi@esempio.it", "hash");
        ReflectionTestUtils.setField(luigi, "id", UUID.randomUUID());
        when(utenteRepository.findByUsernameIgnoreCase("luigi")).thenReturn(List.of(luigi));

        assertThatThrownBy(() -> service.modifica(utente, new ModificaAccountDTO("luigi", "mario@esempio.it", "giusta123"), IP))
                .isInstanceOf(ConflictException.class);
        verify(utenteRepository, never()).save(any());
    }

    @Test
    void usernameConSpaziTroppoCorto() {
        assertThatThrownBy(() -> service.modifica(utente, new ModificaAccountDTO("  ab ", "mario@esempio.it", "giusta123"), IP))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void emailNormalizzata() {
        service.modifica(utente, new ModificaAccountDTO("mario", " Mario.Nuovo@Esempio.IT ", "giusta123"), IP);

        assertThat(utente.getEmail()).isEqualTo("mario.nuovo@esempio.it");
    }

    @Test
    void emailDiUnAltro() {
        Utente luigi = new Utente("luigi", "luigi@esempio.it", "hash");
        ReflectionTestUtils.setField(luigi, "id", UUID.randomUUID());
        when(utenteRepository.findByEmailIgnoreCase("luigi@esempio.it")).thenReturn(List.of(luigi));

        assertThatThrownBy(() -> service.modifica(utente, new ModificaAccountDTO("mario", "Luigi@Esempio.it", "giusta123"), IP))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void cambioPasswordImpostaDataENuovoHash() {
        when(passwordEncoder.encode("nuovissima1")).thenReturn("hash-nuovo");
        when(jwtTools.generaToken(utente)).thenReturn("token-nuovo");

        LoginResponseDTO risposta = service.cambiaPassword(utente, new CambioPasswordDTO("giusta123", "nuovissima1"), IP);

        assertThat(utente.getPassword()).isEqualTo("hash-nuovo");
        assertThat(utente.getPasswordCambiataIl()).isNotNull();
        assertThat(risposta.token()).isEqualTo("token-nuovo");
        verify(limitatoreLogin).riuscito("mario@esempio.it");
    }

    @Test
    void cambioPasswordConAttualeSbagliata() {
        assertThatThrownBy(() -> service.cambiaPassword(utente, new CambioPasswordDTO("sbagliata", "nuovissima1"), IP))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Password errata");
        assertThat(utente.getPassword()).isEqualTo("hash-vecchio");
        assertThat(utente.getPasswordCambiataIl()).isNull();
    }

    // 40 lettere accentate = 80 byte: BCrypt ne considera solo 72
    @Test
    void nuovaPasswordOltre72Byte() {
        assertThatThrownBy(() -> service.cambiaPassword(utente, new CambioPasswordDTO("giusta123", "è".repeat(40)), IP))
                .isInstanceOf(BadRequestException.class);
        verify(passwordEncoder, never()).encode(anyString());
    }
}
