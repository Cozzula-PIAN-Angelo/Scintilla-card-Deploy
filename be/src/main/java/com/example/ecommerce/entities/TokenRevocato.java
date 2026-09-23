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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "token_revocati")
@Getter
@Setter
@NoArgsConstructor
public class TokenRevocato {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(nullable = false, unique = true, length = 512)
    private String token;

    // scadenza originale del JWT: dopo questa data la riga può essere eliminata dalla pulizia periodica
    @Column(nullable = false)
    private Instant scadenza;

    public TokenRevocato(String token, Instant scadenza) {
        this.token = token;
        this.scadenza = scadenza;
    }
}
