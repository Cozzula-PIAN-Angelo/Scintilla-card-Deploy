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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class EspansioneService {

    // es. "4" -> ("", 4, ""), "TG01" -> ("TG", 1, ""), "123a" -> ("", 123, "a")
    private static final Pattern NUMERO_CARTA = Pattern.compile("^(\\D*)(\\d+)(.*)$");

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
                .sorted(Comparator.comparing(Oggetto::getNumero, EspansioneService::confrontaNumeri))
                .map(OggettoResponseDTO::from)
                .toList();
    }

    // ordine da album: prima i numeri semplici (1, 2, ..., 102), poi i prefissi (GG01, TG01),
    // infine i numeri senza cifre; null in fondo
    private static int confrontaNumeri(String a, String b) {
        if (a == null || b == null) {
            return a == null ? (b == null ? 0 : 1) : -1;
        }
        Matcher ma = NUMERO_CARTA.matcher(a);
        Matcher mb = NUMERO_CARTA.matcher(b);
        boolean aNumerico = ma.matches();
        boolean bNumerico = mb.matches();
        if (!aNumerico || !bNumerico) {
            return aNumerico == bNumerico ? a.compareTo(b) : (aNumerico ? -1 : 1);
        }
        return Comparator.comparing((Matcher m) -> m.group(1))
                .thenComparingLong(m -> Long.parseLong(m.group(2)))
                .thenComparing(m -> m.group(3))
                .compare(ma, mb);
    }
}
