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

    // un lock per set: due visitatori che aprono insieme un set nuovo non lo importano due volte
    private final ConcurrentMap<String, Object> lockPerSet = new ConcurrentHashMap<>();

    // aggiorna l'elenco delle espansioni da pokemontcg.io: all'avvio e ogni notte (nuovi set)
    @Scheduled(cron = "0 30 4 * * *")
    public void sincronizza() {
        List<Espansione> espansioni = pokemonTcgService.scaricaEspansioni();
        espansioneRepository.saveAll(espansioni);
        log.info("Espansioni sincronizzate: {}", espansioni.size());
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

    // carte del set, ordinate per numero; alla prima apertura le importa da pokemontcg.io
    public List<OggettoResponseDTO> carte(String id) {
        Espansione espansione = espansioneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Espansione " + id + " non trovata"));

        if (!espansione.isImportata()) {
            synchronized (lockPerSet.computeIfAbsent(id, chiave -> new Object())) {
                // ricontrollo: nel frattempo un'altra richiesta potrebbe averlo già importato
                boolean giaImportata = espansioneRepository.findById(id).map(Espansione::isImportata).orElse(false);
                if (!giaImportata) {
                    pokemonTcgService.importaSet(id);
                }
            }
        }

        return oggettoRepository.findByEspansioneId(id).stream()
                .sorted(Comparator.comparing(Oggetto::getNumero, NumeriCarta::confronta))
                .map(OggettoResponseDTO::from)
                .toList();
    }
}
