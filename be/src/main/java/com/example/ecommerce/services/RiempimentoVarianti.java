package com.example.ecommerce.services;

import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// Legge da pokemontcg.io varianti, rarità e artista delle carte già nel catalogo, qualche set alla volta.
// Non è notturno perché Render (piano free) dorme: un'ora di attività basta a un giro, ovunque cada.
// Non passa dal LimitatoreImport: quello protegge gli import lanciati dagli admin, qui il ritmo
// (5 set l'ora) lo decide già il job
@Slf4j
@Component
@RequiredArgsConstructor
public class RiempimentoVarianti {

    static final int SET_PER_GIRO = 5;

    private final PokemonTcgService pokemonTcgService;
    private final OggettoRepository oggettoRepository;

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    public void esegui() {
        for (String setId : oggettoRepository.findSetConVariantiMancanti(SET_PER_GIRO)) {
            // un set che fallisce non ferma gli altri: ci riprova al giro dopo
            try {
                pokemonTcgService.riempiVarianti(setId);
            } catch (RuntimeException ex) {
                log.warn("Varianti, rarità e artisti del set {} non aggiornati: {}", setId, ex.getMessage());
            }
        }
    }
}
