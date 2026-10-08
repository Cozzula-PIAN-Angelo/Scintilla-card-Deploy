package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Utente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UtenteRepository extends JpaRepository<Utente, UUID> {

    Optional<Utente> findByEmail(String email);

    Optional<Utente> findByUsername(String username);

    // le email si salvano in minuscolo, ma gli account registrati prima possono averle con le maiuscole:
    // la ricerca ignora maiuscole e minuscole. Una lista, perché tra quegli account vecchi possono
    // esserci due email uguali a meno delle maiuscole
    List<Utente> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsername(String username);

    // elenco per l'admin: gli account cancellati restano nel DB ma non si gestiscono più
    Page<Utente> findByAnonimizzatoIlIsNull(Pageable pageable);
}
