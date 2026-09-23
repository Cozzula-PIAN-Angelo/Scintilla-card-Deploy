package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.PokemonImportato;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.PokemonImportatoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@RequiredArgsConstructor
public class PokedexService {

    // margine sopra i 1025 Pokémon attuali: i nuovi arrivano con le nuove generazioni
    private static final int NUMERO_MASSIMO = 2000;
    // dopo una settimana si riscarica: così compaiono le carte dei set usciti nel frattempo
    private static final Duration VALIDITA_IMPORT = Duration.ofDays(7);

    private final OggettoRepository oggettoRepository;
    private final PokemonImportatoRepository pokemonImportatoRepository;
    private final PokemonTcgService pokemonTcgService;

    // un lock per Pokémon: due visitatori che aprono insieme lo stesso Pokémon lo importano una volta sola
    private final ConcurrentMap<Integer, Object> lockPerPokemon = new ConcurrentHashMap<>();

    // carte in cui compare il Pokémon, dalla più recente; alla prima apertura si importano da pokemontcg.io
    public List<OggettoResponseDTO> carte(int numero) {
        if (numero < 1 || numero > NUMERO_MASSIMO) {
            throw new BadRequestException("Numero di Pokédex non valido: deve essere tra 1 e " + NUMERO_MASSIMO);
        }

        if (daImportare(numero)) {
            synchronized (lockPerPokemon.computeIfAbsent(numero, chiave -> new Object())) {
                // ricontrollo: nel frattempo un'altra richiesta potrebbe averlo già importato
                if (daImportare(numero)) {
                    pokemonTcgService.importaPokemon(numero);
                    pokemonImportatoRepository.save(new PokemonImportato(numero, Instant.now()));
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

    private boolean daImportare(int numero) {
        return pokemonImportatoRepository.findById(numero)
                .map(importato -> importato.getImportatoIl().isBefore(Instant.now().minus(VALIDITA_IMPORT)))
                .orElse(true);
    }

    private static LocalDate dataUscita(Oggetto oggetto) {
        Espansione espansione = oggetto.getEspansione();
        return espansione == null ? null : espansione.getDataUscita();
    }
}
