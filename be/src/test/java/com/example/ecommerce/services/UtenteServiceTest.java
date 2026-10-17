package com.example.ecommerce.services;

import com.example.ecommerce.entities.Ruolo;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import com.example.ecommerce.payloads.RegistrazioneDTO;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UtenteServiceTest {

    @Mock
    private UtenteRepository utenteRepository;
    @Mock
    private RuoloUtenteRepository ruoloUtenteRepository;
    @Mock
    private RuoloService ruoloService;
    @Mock
    private PasswordEncoder passwordEncoder;
    // limitatore vero: al massimo 2 registrazioni rifiutate per IP
    @Spy
    private LimitatoreRegistrazione limitatoreRegistrazione = new LimitatoreRegistrazione(2, Clock.systemUTC());

    @InjectMocks
    private UtenteService service;

    private static final String IP = "1.1.1.1";

    // il login toglie gli spazi all'identificativo: uno username salvato con gli spazi non entrerebbe più
    @Test
    void registrazioneTogliGliSpaziAlloUsername() {
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(utenteRepository.save(any(Utente.class))).thenAnswer(invocazione -> invocazione.getArgument(0));
        when(ruoloService.findByNome(anyString())).thenReturn(new Ruolo("UTENTE"));

        UtenteResponseDTO risposta = service.registra(new RegistrazioneDTO("  Mario  ", "mario@esempio.it", "password123"), IP);

        ArgumentCaptor<Utente> salvato = ArgumentCaptor.forClass(Utente.class);
        verify(utenteRepository).save(salvato.capture());
        // maiuscole conservate: si salva come l'ha scritto l'utente
        assertThat(salvato.getValue().getUsername()).isEqualTo("Mario");
        assertThat(risposta.username()).isEqualTo("Mario");
    }

    // "Mario" e "mario" sarebbero due account indistinguibili a colpo d'occhio
    @Test
    void usernameGiaUsatoConMaiuscoleDiverseVieneRifiutato() {
        when(utenteRepository.existsByUsernameIgnoreCase("mario")).thenReturn(true);

        assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("mario", "nuovo@esempio.it", "password123"), IP))
                .isInstanceOf(ConflictException.class);
        verify(utenteRepository, never()).save(any());
    }

    // @Size conta anche gli spazi: "  ab  " passa la validazione ma dopo il trim è troppo corto
    @Test
    void usernameTroppoCortoDopoITrimVieneRifiutato() {
        assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("  ab  ", "ab@esempio.it", "password123"), IP))
                .isInstanceOf(BadRequestException.class);
        verify(utenteRepository, never()).save(any());
    }

    // chi prova tante email (o username) per scoprire quali sono registrate viene fermato:
    // dopo il limite di registrazioni rifiutate si risponde 429 senza nemmeno controllare
    @Test
    void troppeRegistrazioniRifiutateDalloStessoIpRispondono429() {
        when(utenteRepository.existsByUsernameIgnoreCase("mario")).thenReturn(true);
        when(utenteRepository.existsByEmailIgnoreCase("preso@esempio.it")).thenReturn(true);

        assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("mario", "a@esempio.it", "password123"), IP))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("luigi", "preso@esempio.it", "password123"), IP))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("peach", "preso@esempio.it", "password123"), IP))
                .isInstanceOf(TroppeRichiesteException.class)
                .hasMessageContaining("riprova tra 15 minuti");
        verify(utenteRepository, times(1)).existsByEmailIgnoreCase("preso@esempio.it");

        // un altro indirizzo non è bloccato
        assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("peach", "preso@esempio.it", "password123"), "2.2.2.2"))
                .isInstanceOf(ConflictException.class);
    }

    // solo i conflitti rivelano qualcosa: gli errori di validazione non consumano il limite
    @Test
    void gliErroriDiValidazioneNonContano() {
        when(utenteRepository.existsByEmailIgnoreCase("preso@esempio.it")).thenReturn(true);
        for (int i = 0; i < 3; i++) {
            assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("  ab  ", "ab@esempio.it", "password123"), IP))
                    .isInstanceOf(BadRequestException.class);
        }

        assertThatThrownBy(() -> service.registra(new RegistrazioneDTO("mario", "preso@esempio.it", "password123"), IP))
                .isInstanceOf(ConflictException.class);
    }
}
