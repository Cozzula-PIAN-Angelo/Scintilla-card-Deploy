package com.example.ecommerce.security;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.UnauthorizedException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
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

    // il JWTFilter legge il token una volta sola: utente, jti per la blacklist e scadenza per il logout
    @Test
    void verificaRestituisceIdJtiEScadenza() {
        JWTTools tools = new JWTTools(SECRET, UN_GIORNO);

        TokenVerificato verificato = tools.verifica(tools.generaToken(utente));

        assertThat(verificato.idUtente()).isEqualTo(id);
        assertThat(verificato.jti()).isNotNull();
        assertThat(verificato.scadenza()).isAfter(Instant.now()).isBefore(Instant.now().plusMillis(UN_GIORNO + 1000));
    }

    // serve al JWTFilter per rifiutare i token emessi prima di un cambio password
    @Test
    void verificaRestituisceLEmissione() {
        JWTTools tools = new JWTTools(SECRET, UN_GIORNO);

        TokenVerificato verificato = tools.verifica(tools.generaToken(utente));

        assertThat(verificato.emessoIl()).isBetween(Instant.now().minusSeconds(2), Instant.now());
    }

    @Test
    void tokenScadutoVieneRifiutato() {
        JWTTools tools = new JWTTools(SECRET, -1000);
        String scaduto = tools.generaToken(utente);

        assertThatThrownBy(() -> tools.verifica(scaduto)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void tokenFirmatoConUnAltroSecretVieneRifiutato() {
        String altrui = new JWTTools("un-altro-secret-lungo-almeno-trentadue-caratteri", UN_GIORNO).generaToken(utente);

        assertThatThrownBy(() -> new JWTTools(SECRET, UN_GIORNO).verifica(altrui)).isInstanceOf(UnauthorizedException.class);
    }

    // il decoder di JJWT ignora caratteri in eccesso in fondo alla firma: "<token>x" può risultare valido.
    // Con la blacklist sul jti non importa: o viene rifiutato, o ha lo stesso jti e quindi resta revocato
    @Test
    void tokenAllungatoHaLoStessoJti() {
        JWTTools tools = new JWTTools(SECRET, UN_GIORNO);
        String token = tools.generaToken(utente);
        UUID jti = tools.verifica(token).jti();

        try {
            assertThat(tools.verifica(token + "x").jti()).isEqualTo(jti);
        } catch (UnauthorizedException rifiutato) {
            // anche così va bene: un token diverso non passa
        }
    }

    // firmato con il nostro secret ma senza id: non l'abbiamo emesso noi, e non si potrebbe revocare
    @Test
    void tokenSenzaJtiVieneRifiutato() {
        String senzaJti = Jwts.builder()
                .subject(id.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + UN_GIORNO))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> new JWTTools(SECRET, UN_GIORNO).verifica(senzaJti)).isInstanceOf(UnauthorizedException.class);
    }
}
