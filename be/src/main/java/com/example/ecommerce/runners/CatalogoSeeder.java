package com.example.ecommerce.runners;

import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.services.EspansioneService;
import com.example.ecommerce.services.PokemonTcgService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

// all'avvio sincronizza l'elenco delle espansioni e, se il catalogo è vuoto, importa i set di app.seed.set.
// Un errore dell'API esterna non blocca l'avvio: le espansioni si risincronizzano alla prima visita della
// vetrina, le carte si importano all'apertura di un set o con POST /carte/importa-set/{setId}
@Slf4j
@Component
public class CatalogoSeeder implements CommandLineRunner {

    private final OggettoRepository oggettoRepository;
    private final PokemonTcgService pokemonTcgService;
    private final EspansioneService espansioneService;
    private final List<String> setIniziali;

    public CatalogoSeeder(OggettoRepository oggettoRepository,
                          PokemonTcgService pokemonTcgService,
                          EspansioneService espansioneService,
                          @Value("${app.seed.set:}") List<String> setIniziali) {
        this.oggettoRepository = oggettoRepository;
        this.pokemonTcgService = pokemonTcgService;
        this.espansioneService = espansioneService;
        this.setIniziali = setIniziali;
    }

    @Override
    public void run(String... args) {
        try {
            espansioneService.sincronizza();
        } catch (RuntimeException ex) {
            log.warn("Seeder catalogo: sincronizzazione espansioni fallita ({}), si riprova alla prima visita",
                    ex.getMessage());
        }

        if (oggettoRepository.count() > 0) {
            log.info("Seeder catalogo: catalogo già popolato, salto");
            return;
        }
        for (String setId : setIniziali) {
            if (setId.isBlank()) {
                continue;
            }
            try {
                pokemonTcgService.importaSet(setId);
            } catch (RuntimeException ex) {
                log.warn("Seeder catalogo: import del set {} fallito ({}), riprova con POST /carte/importa-set/{}",
                        setId, ex.getMessage(), setId);
            }
        }
    }
}
