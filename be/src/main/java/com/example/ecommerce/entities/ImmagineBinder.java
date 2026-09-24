package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

// immagine di copertina caricata dall'utente, già ridimensionata e compressa dal browser.
// Tabella separata: la lista dei binder non si porta dietro i byte
@Entity
@Table(name = "binder_immagini")
@Getter
@Setter
@NoArgsConstructor
public class ImmagineBinder {

    // stesso id del binder
    @Id
    @Setter(AccessLevel.NONE)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "id_binder")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Binder binder;

    // byte[] senza @Lob: in PostgreSQL diventa bytea
    @Column(nullable = false)
    private byte[] contenuto;

    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;

    public ImmagineBinder(Binder binder, byte[] contenuto, String contentType) {
        this.binder = binder;
        this.contenuto = contenuto;
        this.contentType = contentType;
    }
}
