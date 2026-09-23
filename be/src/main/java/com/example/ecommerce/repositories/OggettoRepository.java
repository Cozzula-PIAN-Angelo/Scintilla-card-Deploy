package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Oggetto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

public interface OggettoRepository extends JpaRepository<Oggetto, UUID> {

    boolean existsByNome(String nome);

    boolean existsByNomeAndIdNot(String nome, UUID id);

    boolean existsByIdEsterno(String idEsterno);

    // tra gli idEsterno passati, quelli già importati: una sola query per un'intera pagina di risultati
    @Query("SELECT o.idEsterno FROM Oggetto o WHERE o.idEsterno IN :idEsterni")
    Set<String> findIdEsterniPresenti(@Param("idEsterni") Collection<String> idEsterni);
}
