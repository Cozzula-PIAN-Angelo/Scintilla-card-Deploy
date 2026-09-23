package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.RuoloUtente;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RuoloUtenteRepository extends JpaRepository<RuoloUtente, UUID> {

    // carica il ruolo nella stessa query: serve a leggerne il nome senza lazy loading
    @EntityGraph(attributePaths = "ruolo")
    List<RuoloUtente> findByUtenteId(UUID utenteId);

    // ruoli di tutti gli utenti di una pagina in una sola query
    @EntityGraph(attributePaths = "ruolo")
    List<RuoloUtente> findByUtenteIdIn(Collection<UUID> utenteIds);

    boolean existsByUtenteIdAndRuoloNome(UUID utenteId, String nomeRuolo);

    Optional<RuoloUtente> findByUtenteIdAndRuoloNome(UUID utenteId, String nomeRuolo);

    long countByRuoloNome(String nomeRuolo);
}
