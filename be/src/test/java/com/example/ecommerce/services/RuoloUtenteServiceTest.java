package com.example.ecommerce.services;

import com.example.ecommerce.entities.NomiRuolo;
import com.example.ecommerce.entities.Ruolo;
import com.example.ecommerce.entities.RuoloUtente;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RuoloUtenteServiceTest {

    @Mock
    private RuoloUtenteRepository ruoloUtenteRepository;
    @Mock
    private UtenteService utenteService;
    @Mock
    private RuoloService ruoloService;

    @InjectMocks
    private RuoloUtenteService service;

    private UUID id;
    private RuoloUtente ruoloAdmin;

    @BeforeEach
    void prepara() {
        id = UUID.randomUUID();
        Utente utente = new Utente("mario", "mario@esempio.it", "hash");
        ReflectionTestUtils.setField(utente, "id", id);
        ruoloAdmin = new RuoloUtente(utente, new Ruolo(NomiRuolo.ADMIN));
        when(utenteService.findById(id)).thenReturn(utente);
    }

    // senza nessun admin non si potrebbe più nominarne uno
    @Test
    void allUltimoAdminNonSiRevocaIlRuolo() {
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.of(ruoloAdmin));
        when(ruoloUtenteRepository.countByRuoloNome(NomiRuolo.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> service.revocaAdmin(id))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("ultimo admin");
        verify(ruoloUtenteRepository, never()).delete(any());
    }

    @Test
    void conUnAltroAdminIlRuoloSiRevoca() {
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.of(ruoloAdmin));
        when(ruoloUtenteRepository.countByRuoloNome(NomiRuolo.ADMIN)).thenReturn(2L);

        service.revocaAdmin(id);

        verify(ruoloUtenteRepository).delete(ruoloAdmin);
    }

    @Test
    void chiNonEAdminRisponde404() {
        when(ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.revocaAdmin(id)).isInstanceOf(NotFoundException.class);
    }
}
