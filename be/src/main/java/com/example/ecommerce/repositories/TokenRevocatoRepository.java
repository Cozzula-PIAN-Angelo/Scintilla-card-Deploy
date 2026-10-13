package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.TokenRevocato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface TokenRevocatoRepository extends JpaRepository<TokenRevocato, UUID> {

    long deleteByScadenzaBefore(Instant istante);

    // un solo INSERT: con due logout simultanei dello stesso token il secondo non fa nulla invece di
    // violare la chiave primaria. Restituisce 1 se la riga è nuova, 0 se c'era già
    @Modifying
    @Query(value = "INSERT INTO token_revocati (jti, scadenza) VALUES (:jti, :scadenza) ON CONFLICT (jti) DO NOTHING",
            nativeQuery = true)
    int revocaSeAssente(@Param("jti") UUID jti, @Param("scadenza") Instant scadenza);
}
