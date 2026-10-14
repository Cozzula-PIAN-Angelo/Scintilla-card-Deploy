package com.example.ecommerce.controllers;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.payloads.CopiaDTO;
import com.example.ecommerce.payloads.ModificaCollezioneDTO;
import com.example.ecommerce.services.CollezioneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// collezione dell'utente autenticato. Niente PUT: il CORS ammette solo GET, POST, PATCH e DELETE
@RestController
@RequestMapping("/me/collezione")
@RequiredArgsConstructor
public class CollezioneController {

    private final CollezioneService collezioneService;

    // copie possedute in un set (?espansione=), in un Pokémon (?pokemon=) oppure tra le carte di un artista
    // (?artista=slug): uno solo dei tre
    @GetMapping
    public List<CopiaDTO> getCopie(@AuthenticationPrincipal Utente utente,
                                   @RequestParam(required = false) String espansione,
                                   @RequestParam(required = false) Integer pokemon,
                                   @RequestParam(required = false) String artista) {
        return collezioneService.copie(utente, espansione, pokemon, artista);
    }

    @PatchMapping
    public CopiaDTO modifica(@AuthenticationPrincipal Utente utente, @RequestBody @Valid ModificaCollezioneDTO body) {
        return collezioneService.modifica(utente, body);
    }
}
