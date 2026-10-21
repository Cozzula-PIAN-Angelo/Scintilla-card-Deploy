package com.example.ecommerce.entities;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// la parte "vetrina" dell'utente: niente email né password, così un giorno può diventare pubblica.
// Le liste si sostituiscono con una lista nuova, mai modificate sul posto: Hibernate cancella e
// reinserisce le righe e i vincoli UNIQUE non si scontrano (es. scambiando due carte).
// Una carta o un binder cancellati lasciano un null al loro posto: chi legge le liste lo salta
@Entity
@Table(name = "profili")
@Getter
@Setter
@NoArgsConstructor
public class Profilo {

    // stesso id dell'utente
    @Id
    @Setter(AccessLevel.NONE)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "id_utente")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Utente utente;

    @Column(length = 160)
    private String bio;

    // #rrggbb; null = colore del tema
    @Column(length = 7)
    private String colore;

    // data dell'ultima immagine profilo, null se non c'è: fa da versione nell'URL dell'immagine
    @Column(name = "avatar_aggiornato_il")
    private Instant avatarAggiornatoIl;

    // numeri del Pokédex nazionale; il primo è il compagno
    @ElementCollection
    // vincoli UNIQUE come in V11: Hibernate non li usa, servono perché lo schema delle entity resti quello di Flyway
    // (SchemaDerivaTest)
    @CollectionTable(name = "profili_squadra", joinColumns = @JoinColumn(name = "id_utente"),
            uniqueConstraints = @UniqueConstraint(name = "uk_profili_squadra_numero", columnNames = {"id_utente", "numero"}))
    @OrderColumn(name = "posizione")
    @Column(name = "numero", nullable = false)
    private List<Integer> squadra = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "profili_vetrina",
            joinColumns = @JoinColumn(name = "id_utente"),
            inverseJoinColumns = @JoinColumn(name = "id_oggetto"),
            uniqueConstraints = @UniqueConstraint(name = "uk_profili_vetrina_oggetto", columnNames = {"id_utente", "id_oggetto"}))
    @OrderColumn(name = "posizione")
    private List<Oggetto> vetrina = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "profili_binder",
            joinColumns = @JoinColumn(name = "id_utente"),
            inverseJoinColumns = @JoinColumn(name = "id_binder"),
            uniqueConstraints = @UniqueConstraint(name = "uk_profili_binder_binder", columnNames = {"id_utente", "id_binder"}))
    @OrderColumn(name = "posizione")
    private List<Binder> binder = new ArrayList<>();

    public Profilo(Utente utente) {
        this.utente = utente;
    }
}
