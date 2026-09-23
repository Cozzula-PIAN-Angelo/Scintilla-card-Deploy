package com.example.ecommerce.services;

import com.example.ecommerce.entities.NomiRuolo;
import com.example.ecommerce.entities.RuoloUtente;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RuoloUtenteService {

    private final RuoloUtenteRepository ruoloUtenteRepository;
    private final UtenteService utenteService;
    private final RuoloService ruoloService;

    @Transactional
    public void assegnaAdmin(UUID utenteId) {
        Utente utente = utenteService.findById(utenteId);

        if (ruoloUtenteRepository.existsByUtenteIdAndRuoloNome(utenteId, NomiRuolo.ADMIN)) {
            throw new ConflictException("L'utente " + utente.getUsername() + " ha già il ruolo ADMIN");
        }

        ruoloUtenteRepository.save(new RuoloUtente(utente, ruoloService.findByNome(NomiRuolo.ADMIN)));
    }

    @Transactional
    public void revocaAdmin(UUID utenteId) {
        Utente utente = utenteService.findById(utenteId);

        RuoloUtente ruoloAdmin = ruoloUtenteRepository.findByUtenteIdAndRuoloNome(utenteId, NomiRuolo.ADMIN)
                .orElseThrow(() -> new NotFoundException("L'utente " + utente.getUsername() + " non ha il ruolo ADMIN"));

        // l'utente è admin, quindi il conteggio è almeno 1: se è esattamente 1 è lui l'ultimo
        if (ruoloUtenteRepository.countByRuoloNome(NomiRuolo.ADMIN) <= 1) {
            throw new ConflictException("Impossibile revocare il ruolo ADMIN a " + utente.getUsername()
                    + ": è l'ultimo admin rimasto");
        }

        ruoloUtenteRepository.delete(ruoloAdmin);
    }
}
