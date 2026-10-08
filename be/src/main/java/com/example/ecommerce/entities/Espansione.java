package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

import java.time.LocalDate;

// espansione (set) di pokemontcg.io; la lista si sincronizza dall'API esterna,
// le carte entrano nel catalogo alla prima apertura in vetrina.
// @DynamicUpdate: l'UPDATE scrive solo le colonne cambiate. La sincronizzazione notturna non tocca
// "importata", quindi non può riportarlo a false se nel frattempo un import l'ha messo a true
@Entity
@DynamicUpdate
@Table(name = "espansioni")
@Getter
@Setter
@NoArgsConstructor
public class Espansione {

    // id di pokemontcg.io, es. base1, sv1
    @Id
    private String id;

    @Column(nullable = false)
    private String nome;

    private String serie;

    @Column(name = "data_uscita")
    private LocalDate dataUscita;

    @Column(name = "totale_carte")
    private Integer totaleCarte;

    @Column(name = "logo_url", length = 512)
    private String logoUrl;

    @Column(name = "simbolo_url", length = 512)
    private String simboloUrl;

    // true quando le carte del set sono già state importate nel catalogo
    @Column(nullable = false)
    private boolean importata;

    public Espansione(String id) {
        this.id = id;
    }
}
