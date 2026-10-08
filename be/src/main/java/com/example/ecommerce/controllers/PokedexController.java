package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.services.PokedexService;
import jakarta.servlet.http.HttpServletRequest;
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

    // la prima apertura importa le carte del Pokémon: l'IP serve al limite sugli import (vedi LimitatoreImport)
    @GetMapping("/{numero}/carte")
    public List<OggettoResponseDTO> carte(@PathVariable int numero, HttpServletRequest request) {
        return pokedexService.carte(numero, request.getRemoteAddr());
    }
}
