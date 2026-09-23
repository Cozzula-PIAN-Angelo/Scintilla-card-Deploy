package com.example.ecommerce.security;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.UnauthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.Encoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JWTTools {

    private final SecretKey chiave;
    private final long durataMillis;

    // Keys.hmacShaKeyFor rifiuta secret sotto i 256 bit: l'app non parte con una chiave debole
    public JWTTools(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration}") long durataMillis) {
        this.chiave = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.durataMillis = durataMillis;
    }

    public String generaToken(Utente utente) {
        long adesso = System.currentTimeMillis();
        return Jwts.builder()
                .subject(utente.getId().toString())
                // id univoco: due login nello stesso secondo producono comunque token diversi,
                // altrimenti un token appena revocato potrebbe coincidere con quello nuovo
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date(adesso))
                .expiration(new Date(adesso + durataMillis))
                .signWith(chiave)
                .compact();
    }

    public void verificaToken(String token) {
        leggiClaims(token);
    }

    public UUID estraiIdUtente(String token) {
        return UUID.fromString(leggiClaims(token).getSubject());
    }

    public Instant estraiScadenza(String token) {
        return leggiClaims(token).getExpiration().toInstant();
    }

    private Claims leggiClaims(String token) {
        try {
            verificaFirmaCanonica(token);
            return Jwts.parser().verifyWith(chiave).build().parseSignedClaims(token).getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            // firma errata, token scaduto, malformato o vuoto
            throw new UnauthorizedException("Token non valido o scaduto: effettua di nuovo il login");
        }
    }

    // il decoder Base64 di JJWT ignora caratteri in eccesso in fondo alla firma: "<token>x" risulterebbe
    // valido pur essendo una stringa diversa, e aggirerebbe la blacklist che confronta il token testualmente.
    // Si accetta solo la firma nella sua codifica canonica (header e payload sono già protetti dalla firma)
    private void verificaFirmaCanonica(String token) {
        String firma = token.substring(token.lastIndexOf('.') + 1);
        if (!Encoders.BASE64URL.encode(Decoders.BASE64URL.decode(firma)).equals(firma)) {
            throw new MalformedJwtException("Firma non in forma canonica");
        }
    }
}
