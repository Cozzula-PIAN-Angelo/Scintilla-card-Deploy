package com.example.ecommerce.services;

import com.example.ecommerce.entities.TokenRevocato;
import com.example.ecommerce.repositories.TokenRevocatoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TokenRevocatoServiceTest {

    @Mock
    private TokenRevocatoRepository repository;

    @InjectMocks
    private TokenRevocatoService service;

    private final UUID jti = UUID.randomUUID();
    private final Instant scadenza = Instant.parse("2026-10-19T10:00:00Z");

    @Test
    void dopoLaRevocaIlJtiRisultaRevocato() {
        when(repository.existsById(jti)).thenReturn(false, true);

        service.revoca(jti, scadenza);

        ArgumentCaptor<TokenRevocato> salvato = ArgumentCaptor.forClass(TokenRevocato.class);
        verify(repository).save(salvato.capture());
        assertThat(salvato.getValue().getJti()).isEqualTo(jti);
        assertThat(salvato.getValue().getScadenza()).isEqualTo(scadenza);
        assertThat(service.isRevocato(jti)).isTrue();
    }

    // secondo logout con lo stesso token: nessun errore e nessuna seconda riga
    @Test
    void revocaDueVolteNonVaInErrore() {
        when(repository.existsById(jti)).thenReturn(true);

        service.revoca(jti, scadenza);

        verify(repository, never()).save(any());
    }
}
