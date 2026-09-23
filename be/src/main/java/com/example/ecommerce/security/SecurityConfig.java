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
                        .requestMatchers(HttpMethod.GET, "/oggetti").permitAll()
                        // vetrina per espansioni: la prima apertura di un set lo importa, ma è pubblica
                        .requestMatchers(HttpMethod.GET, "/espansioni", "/espansioni/*/carte").permitAll()
                        // health check di Render
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
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
                .addFilterBefore(new JWTFilter(jwtTools, tokenRevocatoService, utenteService, erroreJsonWriter),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(originiAmmesse);
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
