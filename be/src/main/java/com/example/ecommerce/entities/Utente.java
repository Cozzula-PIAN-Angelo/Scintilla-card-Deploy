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
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "utenti")
@Getter
@Setter
@NoArgsConstructor
public class Utente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(AccessLevel.NONE)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    // hash BCrypt: 60 caratteri
    @Column(nullable = false, length = 60)
    private String password;

    // account cancellato: la riga resta (statistiche, preferiti e binder restano collegati),
    // ma username, email e password non sono più quelli dell'utente. Null per gli account attivi
    @Column(name = "anonimizzato_il")
    private Instant anonimizzatoIl;

    public Utente(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
    }

    public boolean isAnonimizzato() {
        return anonimizzatoIl != null;
    }

    // le email si salvano così: "Mario@Esempio.it" e "mario@esempio.it" sono lo stesso indirizzo.
    // Locale.ROOT: con la lingua turca "I" diventerebbe "ı"
    public static String normalizzaEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
