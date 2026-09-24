package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Oggetto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface OggettoRepository extends JpaRepository<Oggetto, UUID> {

    boolean existsByNome(String nome);

    boolean existsByNomeAndIdNot(String nome, UUID id);

    boolean existsByIdEsterno(String idEsterno);

    List<Oggetto> findByEspansioneId(String espansioneId);

    // ricerca per nome nel catalogo (cassetto delle carte del binder)
    Page<Oggetto> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    List<Oggetto> findByIdEsternoIn(Collection<String> idEsterni);

    // carte di un Pokémon, con l'espansione già caricata per ordinarle per data d'uscita
    @Query("SELECT o FROM Oggetto o LEFT JOIN FETCH o.espansione JOIN o.numeriPokedex n WHERE n = :numero")
    List<Oggetto> findByNumeroPokedex(@Param("numero") int numero);

    // tra gli idEsterno passati, quelli già importati: una sola query per un'intera pagina di risultati
    @Query("SELECT o.idEsterno FROM Oggetto o WHERE o.idEsterno IN :idEsterni")
    Set<String> findIdEsterniPresenti(@Param("idEsterni") Collection<String> idEsterni);
}
