package com.example.ecommerce.repositories;

import java.math.BigDecimal;
import java.util.UUID;

// una carta con artista e immagine, solo i campi che servono alla vetrina degli illustratori (vedi VetrinaArtistiService)
public interface CartaDiArtista {

    // grafia grezza di TCGdex, come in oggetti.artista
    String getArtista();

    UUID getId();

    // id di TCGdex: con questo l'admin sceglie la carta simbolo (vedi CartaSimboloArtista)
    String getIdEsterno();

    String getNome();

    String getNumero();

    String getRarita();

    String getImmagineUrl();

    BigDecimal getPrezzoMassimo();

    // quanti numeri del Pokédex ha: 0 per allenatori ed energie
    int getNumeriPokedex();
}
