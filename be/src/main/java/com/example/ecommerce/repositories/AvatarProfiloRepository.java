package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.AvatarProfilo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AvatarProfiloRepository extends JpaRepository<AvatarProfilo, UUID> {
}
