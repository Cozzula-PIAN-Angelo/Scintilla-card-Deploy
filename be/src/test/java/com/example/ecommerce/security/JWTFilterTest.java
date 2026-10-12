package com.example.ecommerce.security;

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

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
                .thenReturn(new TokenVerificato(UUID.randomUUID(), jti, Instant.now().plusSeconds(3600)));
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
}
