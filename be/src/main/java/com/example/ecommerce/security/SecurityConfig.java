package com.example.ecommerce.security;

import com.example.ecommerce.services.TokenRevocatoService;
import com.example.ecommerce.services.UtenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JWTTools jwtTools;
    private final TokenRevocatoService tokenRevocatoService;
    private final UtenteService utenteService;
    private final ErroreJsonWriter erroreJsonWriter;

    // in locale il FE di Vite, in produzione il dominio del sito statico (ALLOWED_ORIGIN)
    @Value("${app.cors.allowed-origins}")
    private List<String> originiAmmesse;

    // Endpoint aperti a tutti, anche senza login. Li usa l'autorizzazione e li usa il JWTFilter:
    // qui un token scaduto o non valido si ignora, invece di rispondere 401 a chi sta solo guardando
    private static final RequestMatcher ENDPOINT_PUBBLICI = new OrRequestMatcher(
            get("/oggetti"),
            // vetrina per espansioni: la prima apertura di un set lo importa, ma è pubblica
            get("/espansioni"),
            get("/espansioni/*/carte"),
            // indice per Pokémon, anch'esso pubblico
            get("/pokedex/*/carte"),
            // health check di Render
            get("/actuator/health"),
            get("/actuator/health/**"));

    private static RequestMatcher get(String percorso) {
        return PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, percorso);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/auth/register", "/auth/login").permitAll()
                        .requestMatchers(ENDPOINT_PUBBLICI).permitAll()
                        // pagina di errore interna di Spring: senza questo un errore su un endpoint
                        // pubblico verrebbe trasformato in 401
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        // nessun token su un endpoint protetto
                        .authenticationEntryPoint((request, response, ex) -> erroreJsonWriter.scrivi(
                                response, 401, "Autenticazione richiesta: invia un token valido nell'header Authorization"))
                        // negazioni decise dalla catena di filtri; quelle di @PreAuthorize
                        // le gestisce il GlobalExceptionHandler
                        .accessDeniedHandler((request, response, ex) -> erroreJsonWriter.scrivi(
                                response, 403, "Non hai i permessi per eseguire questa operazione")))
                .addFilterBefore(new JWTFilter(jwtTools, tokenRevocatoService, utenteService, erroreJsonWriter, ENDPOINT_PUBBLICI),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // "https://a.it, https://b.it" (con lo spazio dopo la virgola) è un errore facile da fare in
        // ALLOWED_ORIGIN: senza trim la seconda origine non corrisponderebbe mai. Una barra finale idem
        config.setAllowedOrigins(originiAmmesse.stream()
                .map(String::trim)
                .map(origine -> origine.endsWith("/") ? origine.substring(0, origine.length() - 1) : origine)
                .filter(origine -> !origine.isEmpty())
                .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
