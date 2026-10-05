package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.ImmagineBinder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

// l'id di un'immagine è quello del suo binder
public interface ImmagineBinderRepository extends JpaRepository<ImmagineBinder, UUID> {

    // immagini di copertina di tutti i binder di un utente, senza caricarne i byte
    @Modifying
    @Query("DELETE FROM ImmagineBinder i WHERE i.id IN (SELECT b.id FROM Binder b WHERE b.utente.id = :utenteId)")
    int deleteByUtenteId(@Param("utenteId") UUID utenteId);
}
