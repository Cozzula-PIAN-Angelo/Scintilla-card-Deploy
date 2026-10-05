package com.example.ecommerce.services;

import com.example.ecommerce.entities.NomiRuolo;
import com.example.ecommerce.entities.RuoloUtente;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.RegistrazioneDTO;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UtenteService {

    // limite di BCrypt
    private static final int MASSIMO_BYTE_PASSWORD = 72;

    private final UtenteRepository utenteRepository;
    private final RuoloUtenteRepository ruoloUtenteRepository;
    private final RuoloService ruoloService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UtenteResponseDTO registra(RegistrazioneDTO body) {
        // oltre i 72 byte BCryptPasswordEncoder.encode lancia IllegalArgumentException (500)
        if (body.password().getBytes(StandardCharsets.UTF_8).length > MASSIMO_BYTE_PASSWORD) {
            throw new BadRequestException("La password è troppo lunga: lettere accentate ed emoji occupano più spazio, "
                    + "accorciala o usa meno caratteri speciali");
        }
        if (utenteRepository.existsByUsername(body.username())) {
            throw new ConflictException("Lo username '" + body.username() + "' è già in uso");
        }
        if (utenteRepository.existsByEmail(body.email())) {
            throw new ConflictException("L'email '" + body.email() + "' è già registrata");
        }

        Utente utente = utenteRepository.save(
                new Utente(body.username(), body.email(), passwordEncoder.encode(body.password())));

        // la registrazione assegna sempre e solo il ruolo UTENTE
        ruoloUtenteRepository.save(new RuoloUtente(utente, ruoloService.findByNome(NomiRuolo.UTENTE)));

        return new UtenteResponseDTO(utente.getId(), utente.getUsername(), utente.getEmail(), List.of(NomiRuolo.UTENTE));
    }

    // uso interno
    @Transactional(readOnly = true)
    public Utente findById(UUID id) {
        return utenteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Utente con id " + id + " non trovato"));
    }

    // uso interno
    @Transactional(readOnly = true)
    public Utente findByEmail(String email) {
        return utenteRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utente con email " + email + " non trovato"));
    }

    @Transactional(readOnly = true)
    public List<String> getNomiRuoli(UUID utenteId) {
        return ruoloUtenteRepository.findByUtenteId(utenteId).stream()
                .map(ruoloUtente -> ruoloUtente.getRuolo().getNome())
                .toList();
    }

    @Transactional(readOnly = true)
    public UtenteResponseDTO getProfilo(Utente utente) {
        return new UtenteResponseDTO(utente.getId(), utente.getUsername(), utente.getEmail(), getNomiRuoli(utente.getId()));
    }

    @Transactional(readOnly = true)
    public PageResponse<UtenteResponseDTO> findAll(Pageable pageable) {
        Page<Utente> utenti = utenteRepository.findByAnonimizzatoIlIsNull(pageable);

        // ruoli di tutta la pagina con una sola query, raggruppati per utente
        List<UUID> ids = utenti.getContent().stream().map(Utente::getId).toList();
        Map<UUID, List<String>> ruoliPerUtente = ids.isEmpty() ? Map.of() : ruoloUtenteRepository.findByUtenteIdIn(ids).stream()
                .collect(Collectors.groupingBy(
                        ruoloUtente -> ruoloUtente.getUtente().getId(),
                        Collectors.mapping(ruoloUtente -> ruoloUtente.getRuolo().getNome(), Collectors.toList())));

        return PageResponse.from(utenti.map(utente -> new UtenteResponseDTO(
                utente.getId(),
                utente.getUsername(),
                utente.getEmail(),
                ruoliPerUtente.getOrDefault(utente.getId(), List.of()))));
    }
}
