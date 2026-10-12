package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.TokenRevocato;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface TokenRevocatoRepository extends JpaRepository<TokenRevocato, UUID> {

    long deleteByScadenzaBefore(Instant istante);
}
