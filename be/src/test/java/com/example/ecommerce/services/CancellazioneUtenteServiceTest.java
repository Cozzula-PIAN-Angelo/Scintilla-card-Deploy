package com.example.ecommerce.services;

import com.example.ecommerce.entities.NomiRuolo;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Profilo;
import com.example.ecommerce.entities.Ruolo;
import com.example.ecommerce.entities.RuoloUtente;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.repositories.AvatarProfiloRepository;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.CollezioneRepository;
import com.example.ecommerce.repositories.ImmagineBinderRepository;
import com.example.ecommerce.repositories.ProfiloRepository;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
    private CollezioneRepository collezioneRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ProfiloRepository profiloRepository;
    @Mock
    private AvatarProfiloRepository avatarProfiloRepository;

    @Mock
    private UtenteService utenteService;
    @Mock
    private RuoloService ruoloService;

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
        // RuoloUtenteService vero sul repository finto: la regola dell'ultimo admin è la sua,
        // e i test sotto ne controllano l'effetto sul repository
        RuoloUtenteService ruoloUtenteService = new RuoloUtenteService(ruoloUtenteRepository, utenteService, ruoloService);
        service = new CancellazioneUtenteService(utenteRepository, ruoloUtenteService, binderRepository,
                immagineRepository, collezioneRepository, passwordEncoder, profiloRepository, avatarProfiloRepository);
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
        // la riga utente resta, quindi il CASCADE del DB non scatta: la collezione si cancella a mano
        verify(collezioneRepository).deleteByUtenteId(id);
        verify(binderRepository).anonimizzaByUtenteId(eq(id), anyString());
        // la riga non si cancella: è il punto dell'anonimizzazione
        verify(utenteRepository, never()).delete(any());
    }

    // dati personali del profilo via; squadra, vetrina, binder in evidenza e colore restano per le statistiche
    @Test
    void anonimizzareTogliAvatarEBio() {
        when(passwordEncoder.encode(anyString())).thenReturn("hash-casuale");
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.empty());
        Profilo profilo = new Profilo(utente);
        Oggetto carta = new Oggetto("Pikachu", BigDecimal.ONE);
        profilo.setBio("Ciao");
        profilo.setColore("#2a75bb");
        profilo.setAvatarAggiornatoIl(Instant.now());
        profilo.setSquadra(new ArrayList<>(List.of(25, 6)));
        profilo.setVetrina(new ArrayList<>(List.of(carta)));
        when(profiloRepository.findById(id)).thenReturn(Optional.of(profilo));
        when(avatarProfiloRepository.existsById(id)).thenReturn(true);

        service.cancellaUtente(id);

        verify(avatarProfiloRepository).deleteById(id);
        assertThat(profilo.getBio()).isNull();
        assertThat(profilo.getAvatarAggiornatoIl()).isNull();
        assertThat(profilo.getColore()).isEqualTo("#2a75bb");
        assertThat(profilo.getSquadra()).containsExactly(25, 6);
        assertThat(profilo.getVetrina()).containsExactly(carta);
        verify(profiloRepository, never()).delete(any());
        verify(profiloRepository, never()).deleteById(any());
    }

    @Test
    void anonimizzareSenzaProfilo() {
        when(passwordEncoder.encode(anyString())).thenReturn("hash-casuale");
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.empty());
        when(profiloRepository.findById(id)).thenReturn(Optional.empty());

        service.cancellaUtente(id);

        verify(avatarProfiloRepository, never()).deleteById(any());
        verify(profiloRepository, never()).save(any());
        assertThat(utente.isAnonimizzato()).isTrue();
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
