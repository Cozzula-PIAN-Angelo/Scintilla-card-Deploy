package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.PokemonImportato;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.PokemonImportatoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PokedexService {

    // dopo una settimana si riscarica: così compaiono le carte dei set usciti nel frattempo
    private static final Duration VALIDITA_IMPORT = Duration.ofDays(7);

    private final OggettoRepository oggettoRepository;
    private final PokemonImportatoRepository pokemonImportatoRepository;
    private final PokemonTcgService pokemonTcgService;
    private final LimitatoreImport limitatoreImport;

    // oltre l'ultimo Pokémon esistente non si interroga pokemontcg.io: ogni numero inventato
    // costerebbe una chiamata (e un posto nel limite degli import) senza trovare niente
    @Value("${app.pokedex.numero-massimo}")
    private int numeroMassimo;

    // aggiornamento settimanale fallito (pokemontcg.io giù): dopo quanto si riprova
    private static final Duration ATTESA_DOPO_ERRORE = Duration.ofMinutes(30);

    // un lock per Pokémon: due visitatori che aprono insieme lo stesso Pokémon lo importano una volta sola
    private final ConcurrentMap<Integer, Object> lockPerPokemon = new ConcurrentHashMap<>();

    // Pokémon il cui aggiornamento è appena fallito, con l'ora del tentativo: nel frattempo si mostrano
    // subito le carte salvate, invece di far aspettare a ogni visita i tentativi verso un'API ancora giù.
    // In memoria, come i set vuoti di EspansioneService: dopo un riavvio si riprova subito
    private final ConcurrentMap<Integer, Instant> aggiornamentiFalliti = new ConcurrentHashMap<>();

    // carte in cui compare il Pokémon, dalla più recente; alla prima apertura si importano da pokemontcg.io.
    // client: IP del visitatore, per il limite sugli import
    public List<OggettoResponseDTO> carte(int numero, String client) {
        if (numero < 1 || numero > numeroMassimo) {
            throw new BadRequestException("Numero di Pokédex non valido: deve essere tra 1 e " + numeroMassimo);
        }

        if (daImportare(numero)) {
            synchronized (lockPerPokemon.computeIfAbsent(numero, chiave -> new Object())) {
                // ricontrollo: nel frattempo un'altra richiesta potrebbe averlo già importato
                if (daImportare(numero)) {
                    importa(numero, client);
                }
            }
        }

        return oggettoRepository.findByNumeroPokedex(numero).stream()
                .sorted(Comparator.comparing(PokedexService::dataUscita, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(o -> o.getEspansione() == null ? "" : o.getEspansione().getId())
                        .thenComparing(Oggetto::getNumero, NumeriCarta::confronta))
                .map(OggettoResponseDTO::from)
                .toList();
    }

    private void importa(int numero, String client) {
        try {
            limitatoreImport.registra(client);
        } catch (TroppeRichiesteException ex) {
            // aggiornamento settimanale di un Pokémon già scaricato: col limite raggiunto si rinvia
            // e si mostrano le carte che ci sono. Il 429 resta solo per la prima apertura
            if (pokemonImportatoRepository.existsById(numero)) {
                return;
            }
            throw ex;
        }
        try {
            pokemonTcgService.importaPokemon(numero);
        } catch (ServizioEsternoException ex) {
            // stesso criterio del limite: con pokemontcg.io giù l'aggiornamento settimanale si rinvia e si
            // mostrano le carte già scaricate. La data non cambia, così alla prossima visita si riprova.
            // Alla prima apertura non c'è niente da mostrare: resta il 502
            if (pokemonImportatoRepository.existsById(numero)) {
                log.warn("Aggiornamento delle carte del Pokémon #{} non riuscito: si mostrano quelle già salvate, "
                        + "si riprova tra {} minuti", numero, ATTESA_DOPO_ERRORE.toMinutes());
                aggiornamentiFalliti.put(numero, Instant.now());
                return;
            }
            throw ex;
        }
        aggiornamentiFalliti.remove(numero);
        pokemonImportatoRepository.save(new PokemonImportato(numero, Instant.now()));
    }

    // mai importato, oppure importato da più di una settimana e senza un aggiornamento fallito da poco
    private boolean daImportare(int numero) {
        return pokemonImportatoRepository.findById(numero)
                .map(importato -> importato.getImportatoIl().isBefore(Instant.now().minus(VALIDITA_IMPORT))
                        && !fallitoDiRecente(numero))
                .orElse(true);
    }

    private boolean fallitoDiRecente(int numero) {
        Instant tentativo = aggiornamentiFalliti.get(numero);
        return tentativo != null && tentativo.isAfter(Instant.now().minus(ATTESA_DOPO_ERRORE));
    }

    private static LocalDate dataUscita(Oggetto oggetto) {
        Espansione espansione = oggetto.getEspansione();
        return espansione == null ? null : espansione.getDataUscita();
    }
}
