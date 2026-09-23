package com.example.ecommerce.runners;

import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.services.PokemonTcgService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

// al primo avvio (catalogo vuoto) importa i set di app.seed.set da pokemontcg.io.
// Un errore dell'API esterna non blocca l'avvio: il catalogo si popola poi con POST /carte/importa-set/{setId}
@Slf4j
@Component
public class CatalogoSeeder implements CommandLineRunner {

    private final OggettoRepository oggettoRepository;
    private final PokemonTcgService pokemonTcgService;
    private final List<String> setIniziali;

    public CatalogoSeeder(OggettoRepository oggettoRepository,
                          PokemonTcgService pokemonTcgService,
                          @Value("${app.seed.set:}") List<String> setIniziali) {
        this.oggettoRepository = oggettoRepository;
        this.pokemonTcgService = pokemonTcgService;
        this.setIniziali = setIniziali;
    }

    @Override
    public void run(String... args) {
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
