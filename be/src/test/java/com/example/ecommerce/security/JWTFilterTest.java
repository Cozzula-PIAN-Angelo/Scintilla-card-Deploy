package com.example.ecommerce.security;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.services.TokenRevocatoService;
import com.example.ecommerce.services.UtenteService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JWTFilterTest {

    @Mock
    private JWTTools jwtTools;
    @Mock
    private TokenRevocatoService tokenRevocatoService;
    @Mock
    private UtenteService utenteService;
    @Mock
    private ErroreJsonWriter erroreJsonWriter;
    @Mock
    private RequestMatcher endpointPubblici;
    @Mock
    private FilterChain filterChain;

    // dopo il logout il token non vale più su un endpoint protetto, anche se firma e scadenza sono buone
    @Test
    void tokenRevocatoRisponde401() throws Exception {
        UUID jti = UUID.randomUUID();
        when(jwtTools.verifica("token-revocato"))
                .thenReturn(new TokenVerificato(UUID.randomUUID(), jti, Instant.now().plusSeconds(3600), Instant.now()));
        when(tokenRevocatoService.isRevocato(jti)).thenReturn(true);
        when(endpointPubblici.matches(any())).thenReturn(false);
        MockHttpServletRequest richiesta = new MockHttpServletRequest("GET", "/me");
        richiesta.setServletPath("/me");
        richiesta.addHeader("Authorization", "Bearer token-revocato");
        MockHttpServletResponse risposta = new MockHttpServletResponse();

        new JWTFilter(jwtTools, tokenRevocatoService, utenteService, erroreJsonWriter, endpointPubblici)
                .doFilter(richiesta, risposta, filterChain);

        verify(erroreJsonWriter).scrivi(eq(risposta), eq(401), anyString());
        verify(filterChain, never()).doFilter(any(), any());
        verify(utenteService, never()).findById(any());
    }

    // password cambiata da un altro dispositivo: i token emessi prima non valgono più
    @Test
    void tokenEmessoPrimaDelCambioPasswordRifiutato() throws Exception {
        MockHttpServletResponse risposta = filtra(Instant.parse("2026-10-20T10:00:00Z"), Instant.parse("2026-10-20T10:00:05.300Z"));

        verify(erroreJsonWriter).scrivi(eq(risposta), eq(401), contains("effettua di nuovo il login"));
        verify(filterChain, never()).doFilter(any(), any());
    }

    // iat ha la precisione del secondo: il token restituito dal cambio stesso deve restare valido
    @Test
    void tokenEmessoNelloStessoSecondoAccettato() throws Exception {
        filtra(Instant.parse("2026-10-20T10:00:05Z"), Instant.parse("2026-10-20T10:00:05.300Z"));

        verify(filterChain).doFilter(any(), any());
        verify(erroreJsonWriter, never()).scrivi(any(), anyInt(), anyString());
    }

    @Test
    void senzaCambioPasswordAccettato() throws Exception {
        filtra(Instant.parse("2026-10-20T10:00:00Z"), null);

        verify(filterChain).doFilter(any(), any());
    }

    private MockHttpServletResponse filtra(Instant emessoIl, Instant passwordCambiataIl) throws Exception {
        UUID id = UUID.randomUUID();
        UUID jti = UUID.randomUUID();
        Utente utente = new Utente("mario", "mario@esempio.it", "hash");
        ReflectionTestUtils.setField(utente, "id", id);
        utente.setPasswordCambiataIl(passwordCambiataIl);
        when(jwtTools.verifica("token")).thenReturn(new TokenVerificato(id, jti, Instant.now().plusSeconds(3600), emessoIl));
        when(utenteService.findById(id)).thenReturn(utente);
        // i ruoli si leggono solo se il token è accettato
        lenient().when(utenteService.getNomiRuoli(id)).thenReturn(List.of("UTENTE"));
        lenient().when(endpointPubblici.matches(any())).thenReturn(false);
        MockHttpServletRequest richiesta = new MockHttpServletRequest("GET", "/me");
        richiesta.setServletPath("/me");
        richiesta.addHeader("Authorization", "Bearer token");
        MockHttpServletResponse risposta = new MockHttpServletResponse();

        new JWTFilter(jwtTools, tokenRevocatoService, utenteService, erroreJsonWriter, endpointPubblici)
                .doFilter(richiesta, risposta, filterChain);
        return risposta;
    }
}
