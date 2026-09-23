package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.CartaEsternaDTO;
import com.example.ecommerce.payloads.ImportaCartaDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.services.PokemonTcgService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/carte")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class CarteController {

    private final PokemonTcgService pokemonTcgService;

    // nome non obbligatorio a livello HTTP: se manca, il service risponde 400 con un messaggio in italiano
    @GetMapping("/ricerca")
    public PageResponse<CartaEsternaDTO> cerca(@RequestParam(required = false) String nome,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "10") int size) {
        return pokemonTcgService.cerca(nome, page, size);
    }

    @PostMapping("/importa/{idEsterno}")
    @ResponseStatus(HttpStatus.CREATED)
    public OggettoResponseDTO importa(@PathVariable String idEsterno,
                                      @RequestBody(required = false) @Valid ImportaCartaDTO body) {
        return pokemonTcgService.importa(idEsterno, body);
    }
}
