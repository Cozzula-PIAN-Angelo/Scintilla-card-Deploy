package com.example.ecommerce.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

// token revocato al logout, identificato dal suo jti (vedi V2__token_revocati_jti.sql)
@Entity
@Table(name = "token_revocati")
@Getter
@Setter
@NoArgsConstructor
public class TokenRevocato {

    // id del JWT, generato da JWTTools a ogni login
    @Id
    @Setter(AccessLevel.NONE)
    private UUID jti;

    // scadenza originale del JWT: dopo questa data la riga può essere eliminata dalla pulizia periodica
    @Column(nullable = false)
    private Instant scadenza;

    public TokenRevocato(UUID jti, Instant scadenza) {
        this.jti = jti;
        this.scadenza = scadenza;
    }
}
