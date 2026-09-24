package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.SlotBinder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SlotBinderRepository extends JpaRepository<SlotBinder, UUID> {

    @EntityGraph(attributePaths = "oggetto")
    List<SlotBinder> findByBinderIdOrderByPaginaAscPosizioneAsc(UUID binderId);

    @EntityGraph(attributePaths = "oggetto")
    Optional<SlotBinder> findByBinderIdAndPaginaAndPosizione(UUID binderId, int pagina, int posizione);

    long countByBinderId(UUID binderId);

    // carte inserite in ciascun binder dell'utente, in una sola query: righe [id binder, conteggio]
    @Query("SELECT s.binder.id, COUNT(s) FROM SlotBinder s WHERE s.binder.utente.id = :utenteId GROUP BY s.binder.id")
    List<Object[]> contaCartePerBinder(@Param("utenteId") UUID utenteId);

    // tasche occupate che resterebbero fuori riducendo le pagine o le tasche per pagina
    @Query("SELECT COUNT(s) FROM SlotBinder s WHERE s.binder.id = :binderId AND (s.pagina >= :pagine OR s.posizione >= :tasche)")
    long contaFuoriDa(@Param("binderId") UUID binderId, @Param("pagine") int pagine, @Param("tasche") int tasche);
}
