package com.example.ecommerce.security;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.UnauthorizedException;
import com.example.ecommerce.services.TokenRevocatoService;
import com.example.ecommerce.services.UtenteService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// non è un @Component: se lo fosse, Spring Boot lo registrerebbe anche come filtro servlet
// fuori dalla catena di security. Viene istanziato in SecurityConfig
@RequiredArgsConstructor
public class JWTFilter extends OncePerRequestFilter {

    private static final String PREFISSO_BEARER = "Bearer ";

    private final JWTTools jwtTools;
    private final TokenRevocatoService tokenRevocatoService;
    private final UtenteService utenteService;
    private final ErroreJsonWriter erroreJsonWriter;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        // nessun token: la richiesta prosegue anonima, sarà la SecurityFilterChain
        // a decidere se l'endpoint è pubblico o se rispondere 401
        if (header == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (!header.startsWith(PREFISSO_BEARER)) {
                throw new UnauthorizedException("Header Authorization non valido: usa il formato 'Bearer <token>'");
            }
            String token = header.substring(PREFISSO_BEARER.length()).trim();

            jwtTools.verificaToken(token);
            if (tokenRevocatoService.isRevocato(token)) {
                throw new UnauthorizedException("Token revocato: effettua di nuovo il login");
            }

            // utente e ruoli riletti dal DB a ogni richiesta: una revoca di ADMIN ha effetto subito
            Utente utente = utenteService.findById(jwtTools.estraiIdUtente(token));
            List<GrantedAuthority> authorities = utenteService.getNomiRuoli(utente.getId()).stream()
                    .<GrantedAuthority>map(nomeRuolo -> new SimpleGrantedAuthority("ROLE_" + nomeRuolo))
                    .toList();

            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(utente, null, authorities));
        } catch (UnauthorizedException | NotFoundException ex) {
            // NotFoundException: token valido di un utente che nel frattempo è stato cancellato
            SecurityContextHolder.clearContext();
            String messaggio = ex instanceof NotFoundException
                    ? "L'utente del token non esiste più"
                    : ex.getMessage();
            erroreJsonWriter.scrivi(response, HttpServletResponse.SC_UNAUTHORIZED, messaggio);
            return;
        }

        filterChain.doFilter(request, response);
    }

    // login e registrazione non richiedono token: così un token vecchio o scaduto
    // rimasto nel client non impedisce di rifare il login
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/auth/login") || path.equals("/auth/register");
    }
}
