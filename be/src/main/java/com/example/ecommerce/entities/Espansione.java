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

// espansione (set) di TCGdex; la lista si sincronizza dall'API esterna,
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

    // id di TCGdex, es. base1, sv03.5
    @Id
    private String id;

    @Column(nullable = false)
    private String nome;

    private String serie;

    @Column(name = "data_uscita")
    private LocalDate dataUscita;

    @Column(name = "totale_carte")
    private Integer totaleCarte;

    // carte ufficiali (cardCount.official di TCGdex): quelle oltre sono le segrete. null = non ancora lette
    @Column(name = "carte_ufficiali")
    private Integer carteUfficiali;

    @Column(name = "logo_url", length = 512)
    private String logoUrl;

    @Column(name = "simbolo_url", length = 512)
    private String simboloUrl;

    // set di un gioco digitale (TCG Pocket): nella home ha la sua riga, per il resto è un set come gli altri
    @Column(nullable = false)
    private boolean digitale;

    // true quando le carte del set sono già state importate nel catalogo
    @Column(nullable = false)
    private boolean importata;

    // scritta dall'admin per la vetrina della home; la sincronizzazione non la tocca. null = nessuna
    @Column(length = 600)
    private String descrizione;

    public Espansione(String id) {
        this.id = id;
    }
}
