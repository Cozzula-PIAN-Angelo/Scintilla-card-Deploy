package com.example.ecommerce.security;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JWTToolsTest {

    private static final String SECRET = "secret-dei-test-lungo-almeno-trentadue-caratteri";
    private static final long UN_GIORNO = 24 * 60 * 60 * 1000L;

    private Utente utente;
    private UUID id;

    @BeforeEach
    void prepara() {
        id = UUID.randomUUID();
        utente = new Utente("mario", "mario@esempio.it", "hash");
        // l'id lo genera Hibernate: nel test si imposta a mano
        ReflectionTestUtils.setField(utente, "id", id);
    }

    // il JWTFilter legge il token una volta sola: verifica e id dell'utente nella stessa chiamata
    @Test
    void verificaRestituisceLIdDellUtente() {
        JWTTools tools = new JWTTools(SECRET, UN_GIORNO);

        assertThat(tools.verificaEdEstraiIdUtente(tools.generaToken(utente))).isEqualTo(id);
    }

    @Test
    void tokenScadutoVieneRifiutato() {
        JWTTools tools = new JWTTools(SECRET, -1000);
        String scaduto = tools.generaToken(utente);

        assertThatThrownBy(() -> tools.verificaEdEstraiIdUtente(scaduto)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void tokenFirmatoConUnAltroSecretVieneRifiutato() {
        String altrui = new JWTTools("un-altro-secret-lungo-almeno-trentadue-caratteri", UN_GIORNO).generaToken(utente);

        assertThatThrownBy(() -> new JWTTools(SECRET, UN_GIORNO).verificaEdEstraiIdUtente(altrui))
                .isInstanceOf(UnauthorizedException.class);
    }

    // "<token>x" passerebbe il decoder di JJWT ma è una stringa diversa da quella in blacklist
    @Test
    void firmaNonCanonicaVieneRifiutata() {
        JWTTools tools = new JWTTools(SECRET, UN_GIORNO);
        String allungato = tools.generaToken(utente) + "x";

        assertThatThrownBy(() -> tools.verificaEdEstraiIdUtente(allungato)).isInstanceOf(UnauthorizedException.class);
    }
}
