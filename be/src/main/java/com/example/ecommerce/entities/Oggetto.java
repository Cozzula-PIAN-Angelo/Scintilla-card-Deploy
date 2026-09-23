package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
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
