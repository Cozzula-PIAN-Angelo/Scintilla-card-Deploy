package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

// copie possedute da un utente di una carta in una certa variante (quantità da 1 a 999).
// Le scritture passano da CollezioneService in SQL; l'entity serve alle letture e alla validazione dello schema
@Entity
@Table(
        name = "collezione",
        uniqueConstraints = @UniqueConstraint(columnNames = {"id_utente", "id_oggetto", "variante"})
)
@Getter
@Setter
@NoArgsConstructor
public class CartaInCollezione {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_utente", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Utente utente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_oggetto", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Oggetto oggetto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Variante variante;

    @Column(nullable = false)
    private int quantita;

    @Column(name = "aggiornata_il", nullable = false)
    private Instant aggiornataIl;
}
