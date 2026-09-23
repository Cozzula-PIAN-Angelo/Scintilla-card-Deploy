package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Espansione;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EspansioneRepository extends JpaRepository<Espansione, String> {

    // dalla più recente; a parità di data per nome
    List<Espansione> findAllByOrderByDataUscitaDescNomeAsc();
}
