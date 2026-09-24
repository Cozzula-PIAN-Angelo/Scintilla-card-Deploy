package com.example.ecommerce.controllers;

import com.example.ecommerce.entities.ImmagineBinder;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.payloads.BinderDTO;
import com.example.ecommerce.payloads.BinderDettaglioDTO;
import com.example.ecommerce.payloads.BinderResponseDTO;
import com.example.ecommerce.payloads.InserisciCartaDTO;
import com.example.ecommerce.payloads.SlotBinderResponseDTO;
import com.example.ecommerce.payloads.SpostaCartaDTO;
import com.example.ecommerce.services.BinderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

// binder dell'utente autenticato. Niente PUT: il CORS ammette solo GET, POST, PATCH e DELETE
@RestController
@RequestMapping("/me/binder")
@RequiredArgsConstructor
public class BinderController {

    private final BinderService binderService;

    @GetMapping
    public List<BinderResponseDTO> getBinder(@AuthenticationPrincipal Utente utente) {
        return binderService.getBinder(utente);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BinderResponseDTO crea(@AuthenticationPrincipal Utente utente, @RequestBody @Valid BinderDTO body) {
        return binderService.crea(utente, body);
    }

    @GetMapping("/{id}")
    public BinderDettaglioDTO getDettaglio(@AuthenticationPrincipal Utente utente, @PathVariable UUID id) {
        return binderService.getDettaglio(utente, id);
    }

    // sostituisce tutte le impostazioni (vedi BinderDTO)
    @PatchMapping("/{id}")
    public BinderResponseDTO modifica(@AuthenticationPrincipal Utente utente,
                                      @PathVariable UUID id,
                                      @RequestBody @Valid BinderDTO body) {
        return binderService.modifica(utente, id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancella(@AuthenticationPrincipal Utente utente, @PathVariable UUID id) {
        binderService.cancella(utente, id);
    }

    @PostMapping("/{id}/slot")
    public SlotBinderResponseDTO inserisci(@AuthenticationPrincipal Utente utente,
                                           @PathVariable UUID id,
                                           @RequestBody @Valid InserisciCartaDTO body) {
        return binderService.inserisci(utente, id, body);
    }

    @PostMapping("/{id}/slot/sposta")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sposta(@AuthenticationPrincipal Utente utente,
                       @PathVariable UUID id,
                       @RequestBody @Valid SpostaCartaDTO body) {
        binderService.sposta(utente, id, body);
    }

    @DeleteMapping("/{id}/slot/{pagina}/{posizione}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void svuota(@AuthenticationPrincipal Utente utente,
                       @PathVariable UUID id,
                       @PathVariable int pagina,
                       @PathVariable int posizione) {
        binderService.svuota(utente, id, pagina, posizione);
    }

    // body = i byte dell'immagine, non multipart: il browser la invia già ridimensionata
    @PostMapping(value = "/{id}/immagine", consumes = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE, "image/webp"})
    public BinderResponseDTO salvaImmagine(@AuthenticationPrincipal Utente utente,
                                           @PathVariable UUID id,
                                           @RequestBody byte[] contenuto) {
        return binderService.salvaImmagine(utente, id, contenuto);
    }

    @DeleteMapping("/{id}/immagine")
    public BinderResponseDTO rimuoviImmagine(@AuthenticationPrincipal Utente utente, @PathVariable UUID id) {
        return binderService.rimuoviImmagine(utente, id);
    }

    // l'URL usato dal frontend contiene la versione (?v=...): a ogni nuova immagine cambia,
    // quindi il browser può tenerla in cache a lungo
    @GetMapping("/{id}/immagine")
    public ResponseEntity<byte[]> getImmagine(@AuthenticationPrincipal Utente utente, @PathVariable UUID id) {
        ImmagineBinder immagine = binderService.getImmagine(utente, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(immagine.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate())
                .body(immagine.getContenuto());
    }
}
