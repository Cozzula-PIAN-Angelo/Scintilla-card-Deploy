package com.example.ecommerce.services;

import com.example.ecommerce.entities.NomiRuolo;
import com.example.ecommerce.entities.Ruolo;
import com.example.ecommerce.entities.RuoloUtente;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.ImmagineBinderRepository;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CancellazioneUtenteServiceTest {

    @Mock
    private UtenteRepository utenteRepository;
    @Mock
    private RuoloUtenteRepository ruoloUtenteRepository;
    @Mock
    private BinderRepository binderRepository;
    @Mock
    private ImmagineBinderRepository immagineRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private CancellazioneUtenteService service;

    private Utente utente;
    private UUID id;

    @BeforeEach
    void prepara() {
        id = UUID.randomUUID();
        utente = new Utente("mario", "mario@esempio.it", "hash-originale");
        // l'id lo genera Hibernate: nel test si imposta a mano
        ReflectionTestUtils.setField(utente, "id", id);
        when(utenteRepository.findById(id)).thenReturn(Optional.of(utente));
    }

    @Test
    void anonimizzaIDatiPersonaliETieneLaRiga() {
        when(passwordEncoder.encode(anyString())).thenReturn("hash-casuale");
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.empty());

        service.cancellaUtente(id);

        assertThat(utente.getId()).isEqualTo(id);
        assertThat(utente.getUsername()).isEqualTo("eliminato-" + id).doesNotContain("@");
        assertThat(utente.getEmail()).isEqualTo("eliminato-" + id + "@anonimo.invalid");
        assertThat(utente.getPassword()).isEqualTo("hash-casuale");
        assertThat(utente.isAnonimizzato()).isTrue();
        verify(immagineRepository).deleteByUtenteId(id);
        verify(binderRepository).anonimizzaByUtenteId(eq(id), anyString());
        // la riga non si cancella: è il punto dell'anonimizzazione
        verify(utenteRepository, never()).delete(any());
    }

    @Test
    void conLaPasswordErrataNonCancellaNiente() {
        when(passwordEncoder.matches("sbagliata", "hash-originale")).thenReturn(false);

        assertThatThrownBy(() -> service.cancellaAccount(utente, "sbagliata"))
                .isInstanceOf(BadRequestException.class);
        assertThat(utente.isAnonimizzato()).isFalse();
        assertThat(utente.getEmail()).isEqualTo("mario@esempio.it");
    }

    @Test
    void lUltimoAdminNonSiPuoCancellare() {
        RuoloUtente ruoloAdmin = new RuoloUtente(utente, new Ruolo(NomiRuolo.ADMIN));
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.of(ruoloAdmin));
        when(ruoloUtenteRepository.countByRuoloNome(NomiRuolo.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> service.cancellaUtente(id)).isInstanceOf(ConflictException.class);
        assertThat(utente.isAnonimizzato()).isFalse();
        verify(ruoloUtenteRepository, never()).delete(any());
    }

    @Test
    void unAdminNonUltimoPerdeIlRuoloEVieneAnonimizzato() {
        RuoloUtente ruoloAdmin = new RuoloUtente(utente, new Ruolo(NomiRuolo.ADMIN));
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.of(ruoloAdmin));
        when(ruoloUtenteRepository.countByRuoloNome(NomiRuolo.ADMIN)).thenReturn(2L);
        when(passwordEncoder.encode(anyString())).thenReturn("hash-casuale");

        service.cancellaUtente(id);

        verify(ruoloUtenteRepository).delete(ruoloAdmin);
        assertThat(utente.isAnonimizzato()).isTrue();
    }

    @Test
    void unAccountGiaAnonimizzatoRisultaInesistente() {
        utente.setAnonimizzatoIl(Instant.now());

        assertThatThrownBy(() -> service.cancellaUtente(id)).isInstanceOf(NotFoundException.class);
    }
}
