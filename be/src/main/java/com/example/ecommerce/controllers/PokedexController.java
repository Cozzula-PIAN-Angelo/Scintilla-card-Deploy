package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
import com.example.ecommerce.services.PokedexService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


// indice per Pokémon: tutte le carte in cui compare un Pokémon del Pokédex nazionale
@RestController
@RequestMapping("/pokedex")
@RequiredArgsConstructor
public class PokedexController {

    private final PokedexService pokedexService;

    // la prima apertura importa le carte del Pokémon: l'IP serve al limite sugli import (vedi LimitatoreImport)
    @GetMapping("/{numero}/carte")
    public CarteDTO carte(@PathVariable int numero, @RequestParam(required = false) Integer pagina,
                          HttpServletRequest request) {
        return pokedexService.carte(numero, pagina, request.getRemoteAddr());
    }

    // a che punto è lo scaricamento (e, se è fermo, lo rilancia): il frontend lo chiede mentre mostra le pagine al volo
    @GetMapping("/{numero}/carte/stato")
    public StatoCarteDTO stato(@PathVariable int numero, HttpServletRequest request) {
        return pokedexService.stato(numero, request.getRemoteAddr());
    }
}
