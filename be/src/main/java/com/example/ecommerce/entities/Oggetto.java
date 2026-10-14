package com.example.ecommerce.entities;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "oggetti")
@Getter
@Setter
@NoArgsConstructor
public class Oggetto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String nome;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal prezzo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    // null per gli oggetti creati a mano
    @Column(name = "immagine_url", length = 512)
    private String immagineUrl;

    // id della carta su pokemontcg.io; null per gli oggetti creati a mano
    // (PostgreSQL ammette più NULL in una colonna UNIQUE)
    @Column(name = "id_esterno", unique = true)
    private String idEsterno;

    // espansione della carta; null per gli oggetti creati a mano
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "espansione_id")
    private Espansione espansione;

    // numero della carta nel set (es. 4, TG01): serve a ordinarle come nell'album
    private String numero;

    // numeri di Pokédex dei Pokémon raffigurati: servono all'indice per Pokémon
    @ElementCollection
    @CollectionTable(name = "oggetti_pokedex", joinColumns = @JoinColumn(name = "oggetto_id"))
    @Column(name = "numero_pokedex", nullable = false)
    private Set<Integer> numeriPokedex = new HashSet<>();

    // versioni in cui esiste la carta (normale, holo, ...): null = non ancora lette da pokemontcg.io,
    // lista vuota = pokemontcg.io non ne indica
    @Convert(converter = ConvertitoreVarianti.class)
    @Column(length = 120)
    private List<Variante> varianti;

    // rarità secondo pokemontcg.io (es. "Double Rare"): null = non ancora letta, '' = pokemontcg.io non la indica
    @Column(length = 60)
    private String rarita;

    // artista secondo pokemontcg.io, grezzo come arriva (può contenere coautori, es. "Shinji Higuchi + Sachiko Eba"):
    // null = non ancora letto, '' = pokemontcg.io non lo indica. I nomi puliti li dà ElencoArtisti
    @Column(length = 200)
    private String artista;

    public Oggetto(String nome, BigDecimal prezzo) {
        this.nome = nome;
        this.prezzo = prezzo;
    }

    public Oggetto(String nome, BigDecimal prezzo, String immagineUrl, String idEsterno) {
        this.nome = nome;
        this.prezzo = prezzo;
        this.immagineUrl = immagineUrl;
        this.idEsterno = idEsterno;
    }
}
