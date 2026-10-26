package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// carta simbolo di un illustratore scelta dall'admin, per il muro della pagina Illustratori (vedi VetrinaArtistiService)
@Entity
@Table(name = "artisti_carta_simbolo")
@Getter
@Setter
@NoArgsConstructor
public class CartaSimboloArtista {

    // slug dell'artista in artisti.json
    @Id
    @Column(length = 100)
    private String slug;

    // id di TCGdex della carta (oggetti.id_esterno)
    @Column(name = "id_esterno", nullable = false)
    private String idEsterno;

    @Column(name = "scelta_il", nullable = false)
    private Instant sceltaIl;

    public CartaSimboloArtista(String slug, String idEsterno, Instant sceltaIl) {
        this.slug = slug;
        this.idEsterno = idEsterno;
        this.sceltaIl = sceltaIl;
    }
}
