package com.example.ecommerce.services;

import com.example.ecommerce.entities.Ruolo;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.repositories.RuoloRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RuoloService {

    private final RuoloRepository ruoloRepository;

    // uso interno
    @Transactional(readOnly = true)
    public Ruolo findByNome(String nome) {
        return ruoloRepository.findByNome(nome)
                .orElseThrow(() -> new NotFoundException("Ruolo '" + nome + "' non trovato"));
    }
}
