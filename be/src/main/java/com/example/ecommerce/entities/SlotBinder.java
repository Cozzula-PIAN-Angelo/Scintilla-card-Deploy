package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.util.UUID;

// tasca occupata di un binder; le tasche vuote non hanno una riga.
// La stessa carta può stare in più tasche: l'unicità è solo sulla posizione
@Entity
@Table(
        name = "binder_slot",
        uniqueConstraints = @UniqueConstraint(columnNames = {"id_binder", "pagina", "posizione"})
)
@Getter
@Setter
@NoArgsConstructor
public class SlotBinder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_binder", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Binder binder;

    // entrambe partono da 0; la posizione si legge riga per riga, da sinistra a destra
    @Column(nullable = false)
    private int pagina;

    @Column(nullable = false)
    private int posizione;

    // una carta tolta dal catalogo lascia la tasca vuota
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_oggetto", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Oggetto oggetto;

    public SlotBinder(Binder binder, int pagina, int posizione, Oggetto oggetto) {
        this.binder = binder;
        this.pagina = pagina;
        this.posizione = posizione;
        this.oggetto = oggetto;
    }
}
