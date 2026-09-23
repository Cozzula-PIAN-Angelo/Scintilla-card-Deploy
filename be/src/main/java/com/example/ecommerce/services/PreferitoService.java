package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.entities.UtenteOggettoPreferito;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.PreferitoResponseDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.UtenteOggettoPreferitoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

// l'Utente arriva sempre dal token, mai dal body della richiesta
@Service
@RequiredArgsConstructor
public class PreferitoService {

    private final UtenteOggettoPreferitoRepository preferitoRepository;
    private final OggettoRepository oggettoRepository;

    @Transactional
    public PreferitoResponseDTO aggiungi(Utente utente, UUID oggettoId) {
        Oggetto oggetto = oggettoRepository.findById(oggettoId)
                .orElseThrow(() -> new NotFoundException("Oggetto con id " + oggettoId + " non trovato"));

        if (preferitoRepository.existsByUtenteIdAndOggettoId(utente.getId(), oggettoId)) {
            throw new ConflictException("L'oggetto '" + oggetto.getNome() + "' è già nei preferiti");
        }

        // flush immediato: così createdAt (data di aggiunta) è valorizzato nella risposta
        UtenteOggettoPreferito preferito = preferitoRepository.saveAndFlush(new UtenteOggettoPreferito(utente, oggetto));
        return PreferitoResponseDTO.from(preferito);
    }

    @Transactional
    public void rimuovi(Utente utente, UUID oggettoId) {
        UtenteOggettoPreferito preferito = preferitoRepository.findByUtenteIdAndOggettoId(utente.getId(), oggettoId)
                .orElseThrow(() -> new NotFoundException("L'oggetto con id " + oggettoId + " non è nei preferiti"));
        preferitoRepository.delete(preferito);
    }

    @Transactional(readOnly = true)
    public PageResponse<PreferitoResponseDTO> getPreferiti(Utente utente, Pageable pageable) {
        return PageResponse.from(
                preferitoRepository.findByUtenteId(utente.getId(), pageable).map(PreferitoResponseDTO::from));
    }

    @Transactional(readOnly = true)
    public List<UUID> getIdsPreferiti(Utente utente) {
        return preferitoRepository.findOggettoIdsByUtenteId(utente.getId());
    }
}
