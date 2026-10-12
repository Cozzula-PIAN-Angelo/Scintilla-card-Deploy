package com.example.ecommerce.security;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.UnauthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
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
                // jti, id univoco del token: è quello che finisce in blacklist al logout, e due login
                // nello stesso secondo producono comunque token diversi
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date(adesso))
                .expiration(new Date(adesso + durataMillis))
                .signWith(chiave)
                .compact();
    }

    // verifica firma e scadenza e restituisce utente, jti e scadenza, leggendo il token una volta sola:
    // il JWTFilter la chiama a ogni richiesta autenticata, il logout per sapere cosa revocare
    public TokenVerificato verifica(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(chiave).build().parseSignedClaims(token).getPayload();
            // subject o jti mancanti o non UUID: firma valida, ma non è un token emesso da noi in questo formato
            return new TokenVerificato(
                    UUID.fromString(claims.getSubject()),
                    UUID.fromString(claims.getId()),
                    claims.getExpiration().toInstant());
        } catch (JwtException | IllegalArgumentException | NullPointerException ex) {
            // firma errata, token scaduto, malformato o vuoto
            throw new UnauthorizedException("Token non valido o scaduto: effettua di nuovo il login");
        }
    }
}
