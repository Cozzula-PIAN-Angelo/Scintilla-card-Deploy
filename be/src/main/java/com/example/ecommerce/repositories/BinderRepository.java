package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Binder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // account cancellato: i binder restano per le statistiche, ma col nome generico (quello scelto
    // dall'utente può contenere dati personali) e senza immagine di copertina
    @Modifying
    @Query("UPDATE Binder b SET b.nome = :nome, b.immagineAggiornataIl = null WHERE b.utente.id = :utenteId")
    int anonimizzaByUtenteId(@Param("utenteId") UUID utenteId, @Param("nome") String nome);
}
