package com.example.ecommerce.services;

import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

// Legge da TCGdex varianti, rarità e artista delle carte già nel catalogo, qualche set alla volta.
// Non è notturno perché Render (piano free) dorme: un'ora di attività basta a un giro, ovunque cada.
// Non passa dal LimitatoreImport: quello protegge gli import lanciati dagli admin, qui il ritmo
// (5 set l'ora) lo decide già il job
@Slf4j
@Component
@RequiredArgsConstructor
public class RiempimentoVarianti {

    static final int SET_PER_GIRO = 5;
    // il primo giro dopo l'avvio passa tutti i set da riempire (TCGdex non ha quote): serve dopo la migrazione,
    // che rimette a null varianti, rarità e artisti di tutte le carte
    static final int PRIMO_GIRO = 1000;
    // carte fuori dai set importati (arrivate da Pokédex e artisti): al primo giro tutte, poi qualche blocco
    static final int PRIMO_GIRO_CARTE = 20000;
    static final int CARTE_PER_GIRO = 240;
    // i prezzi delle carte nei binder si rileggono quando hanno più di una settimana (Cardmarket li aggiorna ogni giorno)
    static final Duration ETA_PREZZI = Duration.ofDays(7);

    private final CatalogoService catalogoService;
    private final OggettoRepository oggettoRepository;
    private boolean primoGiroFatto;

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    public void esegui() {
        int limite = primoGiroFatto ? SET_PER_GIRO : PRIMO_GIRO;
        int limiteCarte = primoGiroFatto ? CARTE_PER_GIRO : PRIMO_GIRO_CARTE;
        primoGiroFatto = true;
        for (String setId : oggettoRepository.findSetConVariantiMancanti(limite)) {
            // un set che fallisce non ferma gli altri: ci riprova al giro dopo
            try {
                catalogoService.riempiVarianti(setId);
            } catch (RuntimeException ex) {
                log.warn("Varianti, rarità e artisti del set {} non aggiornati: {}", setId, ex.getMessage());
            }
        }
        try {
            List<String> carte = oggettoRepository.findIdEsterniDaRiempireFuoriDaiSetImportati(limiteCarte);
            if (!carte.isEmpty()) {
                catalogoService.riempiCarte(carte);
            }
        } catch (RuntimeException ex) {
            log.warn("Carte fuori dai set importati non rilette: {}", ex.getMessage());
        }
        // prezzi delle carte nei binder (valore del binder come fascia): stessi limiti delle carte fuori dai set
        try {
            List<String> carte = oggettoRepository.findIdEsterniConPrezziDaRinfrescare(limiteCarte, Instant.now().minus(ETA_PREZZI));
            if (!carte.isEmpty()) {
                catalogoService.rinfrescaPrezzi(carte);
            }
        } catch (RuntimeException ex) {
            log.warn("Prezzi delle carte nei binder non rinfrescati: {}", ex.getMessage());
        }
    }
}
