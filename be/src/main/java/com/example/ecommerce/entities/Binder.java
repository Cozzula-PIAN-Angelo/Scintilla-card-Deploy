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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

// album di carte di un utente: pagine con un numero fisso di tasche ciascuna
@Entity
@Table(name = "binder")
@Getter
@Setter
@NoArgsConstructor
public class Binder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_utente", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Utente utente;

    @Column(nullable = false, length = 40)
    private String nome;

    // tasche per pagina: 4 (2x2), 9 (3x3) o 12 (4x3)
    @Column(nullable = false)
    private int tasche;

    @Column(nullable = false)
    private int pagine;

    // colore della copertina in esadecimale, es. #2a75bb
    @Column(nullable = false, length = 7)
    private String colore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MotivoBinder motivo;

    // carta nella finestrella della copertina; se viene tolta dal catalogo la finestrella si svuota
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_carta_copertina")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Oggetto cartaCopertina;

    // data dell'ultima immagine di copertina caricata, null se non ce n'è una: fa da versione
    // per la cache del browser e permette di sapere se esiste senza leggere i byte
    @Column(name = "immagine_aggiornata_il")
    private Instant immagineAggiornataIl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Instant createdAt;

    public Binder(Utente utente, String nome, int tasche, int pagine, String colore, MotivoBinder motivo) {
        this.utente = utente;
        this.nome = nome;
        this.tasche = tasche;
        this.pagine = pagine;
        this.colore = colore;
        this.motivo = motivo;
    }
}
