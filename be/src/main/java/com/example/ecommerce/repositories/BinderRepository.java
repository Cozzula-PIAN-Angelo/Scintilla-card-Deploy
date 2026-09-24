package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Binder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BinderRepository extends JpaRepository<Binder, UUID> {

    // carta di copertina caricata in join: evita una query per ogni binder (N+1)
    @EntityGraph(attributePaths = "cartaCopertina")
    List<Binder> findByUtenteIdOrderByCreatedAtAsc(UUID utenteId);

    // un binder di un altro utente risulta inesistente, così non se ne rivela l'esistenza
    @EntityGraph(attributePaths = "cartaCopertina")
    Optional<Binder> findByIdAndUtenteId(UUID id, UUID utenteId);
}
