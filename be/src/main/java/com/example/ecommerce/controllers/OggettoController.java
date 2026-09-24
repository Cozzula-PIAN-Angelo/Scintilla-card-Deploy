package com.example.ecommerce.controllers;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.payloads.ModificaOggettoDTO;
import com.example.ecommerce.payloads.NuovoOggettoDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.PreferitoResponseDTO;
import com.example.ecommerce.services.OggettoService;
import com.example.ecommerce.services.PaginationHelper;
import com.example.ecommerce.services.PreferitoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/oggetti")
@RequiredArgsConstructor
public class OggettoController {

    private final OggettoService oggettoService;
    private final PreferitoService preferitoService;
    private final PaginationHelper paginationHelper;

    @GetMapping
    public PageResponse<OggettoResponseDTO> findAll(@RequestParam(required = false) Integer page,
                                                    @RequestParam(required = false) Integer size,
                                                    @RequestParam(required = false) String sort,
                                                    // ricerca per nome, facoltativa
                                                    @RequestParam(required = false) String q) {
        return oggettoService.findAll(q, paginationHelper.perOggetti(page, size, sort));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public OggettoResponseDTO crea(@RequestBody @Valid NuovoOggettoDTO body) {
        return oggettoService.crea(body);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public OggettoResponseDTO modifica(@PathVariable UUID id, @RequestBody @Valid ModificaOggettoDTO body) {
        return oggettoService.modifica(id, body);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancella(@PathVariable UUID id) {
        oggettoService.cancella(id);
    }

    @PostMapping("/{id}/preferiti")
    @ResponseStatus(HttpStatus.CREATED)
    public PreferitoResponseDTO aggiungiPreferito(@AuthenticationPrincipal Utente utente, @PathVariable UUID id) {
        return preferitoService.aggiungi(utente, id);
    }

    @DeleteMapping("/{id}/preferiti")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rimuoviPreferito(@AuthenticationPrincipal Utente utente, @PathVariable UUID id) {
        preferitoService.rimuovi(utente, id);
    }
}
