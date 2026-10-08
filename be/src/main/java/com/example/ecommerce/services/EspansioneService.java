package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class EspansioneService {

    private final EspansioneRepository espansioneRepository;
    private final OggettoRepository oggettoRepository;
    private final PokemonTcgService pokemonTcgService;
    private final LimitatoreImport limitatoreImport;

    // set trovati senza carte: dopo quanto si richiedono a pokemontcg.io
    private static final Duration ATTESA_SET_VUOTO = Duration.ofHours(6);

    // un lock per set: due visitatori che aprono insieme un set nuovo non lo importano due volte
    private final ConcurrentMap<String, Object> lockPerSet = new ConcurrentHashMap<>();

    // set annunciati ma ancora senza carte, con l'ora dell'ultimo tentativo. In memoria: dopo un
    // riavvio si riprova subito, ed è al più una chiamata per set
    private final ConcurrentMap<String, Instant> setVuoti = new ConcurrentHashMap<>();

    // aggiorna l'elenco delle espansioni da pokemontcg.io: all'avvio e ogni notte (nuovi set)
    @Scheduled(cron = "0 30 4 * * *")
    public void sincronizza() {
        log.info("Espansioni sincronizzate: {}", pokemonTcgService.sincronizzaEspansioni());
    }

    public List<EspansioneResponseDTO> findAll() {
        // primo avvio con pokemontcg.io giù: si riprova alla prima visita della vetrina
        if (espansioneRepository.count() == 0) {
            sincronizza();
        }
        return espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc().stream()
                .map(EspansioneResponseDTO::from)
                .toList();
    }

    // carte del set, ordinate per numero; alla prima apertura le importa da pokemontcg.io.
    // client: IP del visitatore, per il limite sugli import
    public List<OggettoResponseDTO> carte(String id, String client) {
        Espansione espansione = espansioneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Espansione " + id + " non trovata"));

        if (!espansione.isImportata()) {
            synchronized (lockPerSet.computeIfAbsent(id, chiave -> new Object())) {
                // ricontrollo: nel frattempo un'altra richiesta potrebbe averlo già importato
                boolean giaImportata = espansioneRepository.findById(id).map(Espansione::isImportata).orElse(false);
                if (!giaImportata && !vuotoDiRecente(id)) {
                    // dopo il ricontrollo: chi trova il set già importato da un altro non consuma il limite
                    limitatoreImport.registra(client);
                    try {
                        pokemonTcgService.importaSet(id);
                        setVuoti.remove(id);
                    } catch (NotFoundException ex) {
                        // set annunciato ma ancora senza carte su pokemontcg.io: non è un errore, la vetrina
                        // lo mostra vuoto. Non si segna come importato (le carte arriveranno), ma per qualche
                        // ora non si richiede di nuovo, invece di una chiamata esterna a ogni visita
                        log.info("Set {} ancora senza carte su pokemontcg.io: si riprova tra {} ore", id, ATTESA_SET_VUOTO.toHours());
                        setVuoti.put(id, Instant.now());
                    }
                }
            }
        }

        return oggettoRepository.findByEspansioneId(id).stream()
                .sorted(Comparator.comparing(Oggetto::getNumero, NumeriCarta::confronta))
                .map(OggettoResponseDTO::from)
                .toList();
    }

    private boolean vuotoDiRecente(String id) {
        Instant tentativo = setVuoti.get(id);
        return tentativo != null && tentativo.isAfter(Instant.now().minus(ATTESA_SET_VUOTO));
    }
}
