package com.example.ecommerce.config;

import com.example.ecommerce.services.ElencoArtisti;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ArtistiConfig {

    // caricato all'avvio: un artisti.json mancante o rotto ferma l'applicazione invece della prima richiesta
    @Bean
    public ElencoArtisti elencoArtisti() {
        return ElencoArtisti.get();
    }
}
