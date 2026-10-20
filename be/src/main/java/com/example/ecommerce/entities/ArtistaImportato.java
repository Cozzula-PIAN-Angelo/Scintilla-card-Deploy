package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// artisti di cui si sono già scaricate le carte da TCGdex, e quando
@Entity
@Table(name = "artisti_importati")
@Getter
@Setter
@NoArgsConstructor
public class ArtistaImportato {

    // slug dell'artista in artisti.json (es. mitsuhiro-arita), oppure "sconosciuto"
    @Id
    @Column(length = 100)
    private String slug;

    @Column(name = "importato_il", nullable = false)
    private Instant importatoIl;

    public ArtistaImportato(String slug, Instant importatoIl) {
        this.slug = slug;
        this.importatoIl = importatoIl;
    }
}
