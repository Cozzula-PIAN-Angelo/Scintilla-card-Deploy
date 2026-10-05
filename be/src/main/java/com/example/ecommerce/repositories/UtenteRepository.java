package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Utente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UtenteRepository extends JpaRepository<Utente, UUID> {

    Optional<Utente> findByEmail(String email);

    // login con email oppure username nello stesso campo
    Optional<Utente> findByUsernameOrEmail(String username, String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    // elenco per l'admin: gli account cancellati restano nel DB ma non si gestiscono più
    Page<Utente> findByAnonimizzatoIlIsNull(Pageable pageable);
}
