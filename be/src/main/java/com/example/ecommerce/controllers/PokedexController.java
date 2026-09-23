package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.services.PokedexService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// indice per Pokémon: tutte le carte in cui compare un Pokémon del Pokédex nazionale
@RestController
@RequestMapping("/pokedex")
@RequiredArgsConstructor
public class PokedexController {

    private final PokedexService pokedexService;

    @GetMapping("/{numero}/carte")
    public List<OggettoResponseDTO> carte(@PathVariable int numero) {
        return pokedexService.carte(numero);
    }
}
