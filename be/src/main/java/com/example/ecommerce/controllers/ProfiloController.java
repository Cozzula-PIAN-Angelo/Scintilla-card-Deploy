package com.example.ecommerce.controllers;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.payloads.ListaIdDTO;
import com.example.ecommerce.payloads.ModificaProfiloDTO;
import com.example.ecommerce.payloads.ProfiloDTO;
import com.example.ecommerce.payloads.SquadraDTO;
import com.example.ecommerce.services.FormatoImmagine;
import com.example.ecommerce.services.ProfiloService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

// profilo dell'utente autenticato. Le liste si sostituiscono intere con PATCH:
// niente PUT, il CORS ammette solo GET, POST, PATCH e DELETE
@RestController
@RequestMapping("/me/profilo")
@RequiredArgsConstructor
public class ProfiloController {

    private final ProfiloService profiloService;

    @GetMapping
    public ProfiloDTO getProfilo(@AuthenticationPrincipal Utente utente) {
        return profiloService.getProfilo(utente);
    }

    // sostituisce bio e colore (vedi ModificaProfiloDTO)
    @PatchMapping
    public ProfiloDTO modifica(@AuthenticationPrincipal Utente utente, @RequestBody @Valid ModificaProfiloDTO body) {
        return profiloService.modifica(utente, body);
    }

    @PatchMapping("/vetrina")
    public ProfiloDTO salvaVetrina(@AuthenticationPrincipal Utente utente, @RequestBody @Valid ListaIdDTO body) {
        return profiloService.salvaVetrina(utente, body.ids());
    }

    @PatchMapping("/binder")
    public ProfiloDTO salvaBinder(@AuthenticationPrincipal Utente utente, @RequestBody @Valid ListaIdDTO body) {
        return profiloService.salvaBinder(utente, body.ids());
    }

    @PatchMapping("/squadra")
    public ProfiloDTO salvaSquadra(@AuthenticationPrincipal Utente utente, @RequestBody @Valid SquadraDTO body) {
        return profiloService.salvaSquadra(utente, body.numeri());
    }

    // body = i byte dell'immagine, già ritagliata e compressa dal browser. Come per le copertine dei
    // binder si legge al più un byte oltre il limite, invece di tutto il body (vedi BinderController)
    @PostMapping(value = "/avatar", consumes = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE, "image/webp"})
    public ProfiloDTO salvaAvatar(@AuthenticationPrincipal Utente utente, HttpServletRequest request) throws IOException {
        if (request.getContentLengthLong() > FormatoImmagine.DIMENSIONE_MASSIMA) {
            throw new BadRequestException("L'immagine supera 1 MB");
        }
        byte[] contenuto = request.getInputStream().readNBytes(FormatoImmagine.DIMENSIONE_MASSIMA + 1);
        return profiloService.salvaAvatar(utente, contenuto);
    }

    @DeleteMapping("/avatar")
    public ProfiloDTO rimuoviAvatar(@AuthenticationPrincipal Utente utente) {
        return profiloService.rimuoviAvatar(utente);
    }
}
