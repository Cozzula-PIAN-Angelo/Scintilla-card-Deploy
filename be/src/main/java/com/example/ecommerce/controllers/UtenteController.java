package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.services.CancellazioneUtenteService;
import com.example.ecommerce.services.PaginationHelper;
import com.example.ecommerce.services.UtenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/utenti")
@RequiredArgsConstructor
public class UtenteController {

    private final UtenteService utenteService;
    private final CancellazioneUtenteService cancellazioneUtenteService;
    private final PaginationHelper paginationHelper;

    // solo gli account attivi: quelli cancellati restano nel DB per le statistiche
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<UtenteResponseDTO> findAll(@RequestParam(required = false) Integer page,
                                                   @RequestParam(required = false) Integer size) {
        return utenteService.findAll(paginationHelper.perUtenti(page, size));
    }

    // cancella (anonimizza) l'account di un utente
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancella(@PathVariable UUID id) {
        cancellazioneUtenteService.cancellaUtente(id);
    }
}
