package com.example.ecommerce.services;

import com.example.ecommerce.repositories.TokenRevocatoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
    void laRevocaPassaJtiEScadenzaAlRepository() {
        service.revoca(jti, scadenza);

        verify(repository).revocaSeAssente(jti, scadenza);
    }

    @Test
    void unJtiInBlacklistRisultaRevocato() {
        when(repository.existsById(jti)).thenReturn(true);

        assertThat(service.isRevocato(jti)).isTrue();
    }
}
