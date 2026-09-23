package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Pokémon di cui si sono già scaricate le carte da pokemontcg.io, e quando
@Entity
@Table(name = "pokemon_importati")
@Getter
@Setter
@NoArgsConstructor
public class PokemonImportato {

    // numero del Pokédex nazionale
    @Id
    private Integer numero;

    @Column(name = "importato_il", nullable = false)
    private Instant importatoIl;

    public PokemonImportato(Integer numero, Instant importatoIl) {
        this.numero = numero;
        this.importatoIl = importatoIl;
    }
}
