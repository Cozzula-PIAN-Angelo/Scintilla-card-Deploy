package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.CopiaDTO;
import com.example.ecommerce.payloads.ModificaCollezioneDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.repositories.CollezioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CollezioneService {

    private static final int MAX_COPIE = 999;

    private final CollezioneRepository collezioneRepository;
    private final OggettoRepository oggettoRepository;
    private final JdbcTemplate jdbc;
    private final ElencoArtisti elencoArtisti;

    // copie dell'utente in un set, in un Pokémon oppure tra le carte di un artista: esattamente un filtro
    @Transactional(readOnly = true)
    public List<CopiaDTO> copie(Utente utente, String espansione, Integer pokemon, String artista) {
        boolean haSet = espansione != null && !espansione.isBlank();
        boolean haArtista = artista != null && !artista.isBlank();
        int filtri = (haSet ? 1 : 0) + (pokemon != null ? 1 : 0) + (haArtista ? 1 : 0);
        if (filtri != 1) {
            throw new BadRequestException("Indica un set (espansione), un Pokémon (pokemon) oppure un artista (artista)");
        }
        if (haSet) {
            return collezioneRepository.copieDelSet(utente.getId(), espansione);
        }
        if (pokemon != null) {
            return collezioneRepository.copieDelPokemon(utente.getId(), pokemon);
        }
        if (ElencoArtisti.SLUG_SCONOSCIUTO.equals(artista)) {
            return collezioneRepository.copieSenzaArtista(utente.getId());
        }
        ElencoArtisti.Artista trovato = elencoArtisti.perSlug(artista)
                .orElseThrow(() -> new NotFoundException("Artista non trovato: " + artista));
        return collezioneRepository.copieDiArtista(utente.getId(), trovato.grafie());
    }

    // carte possedute per il cassetto del binder, una per carta, dall'ultima aggiunta o modificata; q filtra per nome
    @Transactional(readOnly = true)
    public PageResponse<OggettoResponseDTO> carte(Utente utente, String q, Pageable pageable) {
        String nome = q == null ? "" : q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return PageResponse.from(oggettoRepository.possedute(utente.getId(), nome, pageable).map(OggettoResponseDTO::from));
    }

    @Transactional(readOnly = true)
    public List<CopiaDTO> copieDelleCarte(Utente utente, Collection<UUID> oggettoIds) {
        if (oggettoIds.isEmpty()) {
            return List.of();
        }
        return collezioneRepository.copieDelleCarte(utente.getId(), oggettoIds);
    }

    // le scritture sono singole istruzioni SQL atomiche: più "+" o "−" ravvicinati danno lo stesso
    // risultato in qualunque ordine arrivino, senza leggere prima la quantità
    @Transactional
    public CopiaDTO modifica(Utente utente, ModificaCollezioneDTO body) {
        int delta = body.delta();
        if (delta == 0) {
            throw new BadRequestException("Il delta non può essere 0");
        }
        UUID oggettoId = body.oggettoId();
        if (!oggettoRepository.existsById(oggettoId)) {
            throw new NotFoundException("Oggetto con id " + oggettoId + " non trovato");
        }
        String variante = body.variante().name();

        int quantita;
        if (delta > 0) {
            // nessuna riga restituita = la condizione WHERE blocca l'aggiornamento: si supererebbe 999
            List<Integer> risultato = jdbc.queryForList("""
                    INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il)
                    VALUES (gen_random_uuid(), ?, ?, ?, ?, now())
                    ON CONFLICT (id_utente, id_oggetto, variante)
                    DO UPDATE SET quantita = collezione.quantita + EXCLUDED.quantita, aggiornata_il = now()
                    WHERE collezione.quantita + EXCLUDED.quantita <= ?
                    RETURNING quantita
                    """, Integer.class, utente.getId(), oggettoId, variante, delta, MAX_COPIE);
            if (risultato.isEmpty()) {
                throw new BadRequestException("Al massimo " + MAX_COPIE + " copie per variante");
            }
            quantita = risultato.get(0);
        } else {
            // lock di riga prima di decidere: senza, due "−" contemporanei (READ COMMITTED) vedrebbero entrambi
            // la quantità vecchia e il secondo la porterebbe a 0 violando il CHECK. Col lock il secondo attende
            // il primo e poi legge il valore aggiornato
            List<Integer> attuale = jdbc.queryForList("""
                    SELECT quantita FROM collezione
                    WHERE id_utente = ? AND id_oggetto = ? AND variante = ?
                    FOR UPDATE
                    """, Integer.class, utente.getId(), oggettoId, variante);
            if (attuale.isEmpty()) {
                quantita = 0;
            } else if (attuale.get(0) + delta <= 0) {
                // scende a 0 o sotto: la riga sparisce
                jdbc.update("DELETE FROM collezione WHERE id_utente = ? AND id_oggetto = ? AND variante = ?",
                        utente.getId(), oggettoId, variante);
                quantita = 0;
            } else {
                quantita = attuale.get(0) + delta;
                jdbc.update("UPDATE collezione SET quantita = ?, aggiornata_il = now() "
                        + "WHERE id_utente = ? AND id_oggetto = ? AND variante = ?",
                        quantita, utente.getId(), oggettoId, variante);
            }
        }
        return new CopiaDTO(oggettoId, body.variante(), quantita);
    }
}
