package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.ImmagineBinder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

// l'id di un'immagine è quello del suo binder
public interface ImmagineBinderRepository extends JpaRepository<ImmagineBinder, UUID> {
}
