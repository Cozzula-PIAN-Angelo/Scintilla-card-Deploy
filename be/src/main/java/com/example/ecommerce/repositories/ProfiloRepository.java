package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Profilo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProfiloRepository extends JpaRepository<Profilo, UUID> {
}
