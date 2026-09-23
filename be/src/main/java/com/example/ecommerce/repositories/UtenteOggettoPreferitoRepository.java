package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.UtenteOggettoPreferito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UtenteOggettoPreferitoRepository extends JpaRepository<UtenteOggettoPreferito, UUID> {

    boolean existsByUtenteIdAndOggettoId(UUID utenteId, UUID oggettoId);

    Optional<UtenteOggettoPreferito> findByUtenteIdAndOggettoId(UUID utenteId, UUID oggettoId);

    // oggetto caricato in join: evita una query per ogni preferito (N+1)
    @EntityGraph(attributePaths = "oggetto")
    Page<UtenteOggettoPreferito> findByUtenteId(UUID utenteId, Pageable pageable);

    // solo gli id: al frontend servono per segnare i cuori nel catalogo
    @Query("SELECT p.oggetto.id FROM UtenteOggettoPreferito p WHERE p.utente.id = :utenteId")
    List<UUID> findOggettoIdsByUtenteId(@Param("utenteId") UUID utenteId);
}
