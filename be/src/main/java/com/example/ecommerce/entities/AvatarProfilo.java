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

// immagine profilo, già ritagliata quadrata e compressa dal browser.
// Tabella separata: leggere il profilo non si porta dietro i byte
@Entity
@Table(name = "profili_avatar")
@Getter
@Setter
@NoArgsConstructor
public class AvatarProfilo {

    // stesso id dell'utente
    @Id
    @Setter(AccessLevel.NONE)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "id_utente")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Utente utente;

    // byte[] senza @Lob: in PostgreSQL diventa bytea
    @Column(nullable = false)
    private byte[] contenuto;

    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;

    public AvatarProfilo(Utente utente, byte[] contenuto, String contentType) {
        this.utente = utente;
        this.contenuto = contenuto;
        this.contentType = contentType;
    }
}
