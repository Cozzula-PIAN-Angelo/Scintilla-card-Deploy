package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.AnteprimaSetDTO;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.ModificaEspansioneDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.services.EspansioneService;
import com.example.ecommerce.services.VetrinaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// vetrina pubblica: espansioni e carte di ciascuna
@RestController
@RequestMapping("/espansioni")
@RequiredArgsConstructor
public class EspansioneController {

    private final EspansioneService espansioneService;
    private final VetrinaService vetrinaService;

    @GetMapping
    public List<EspansioneResponseDTO> findAll() {
        return espansioneService.findAll();
    }

    // vetrina della home: i set più recenti già scaricati, con carte di punta e rarità (vedi VetrinaService)
    @GetMapping("/anteprime")
    public List<AnteprimaSetDTO> anteprime() {
        return vetrinaService.anteprime();
    }

    // descrizione del set mostrata nella hero della home
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public EspansioneResponseDTO modifica(@PathVariable String id, @RequestBody @Valid ModificaEspansioneDTO body) {
        return espansioneService.modificaDescrizione(id, body.descrizione());
    }

    // la prima apertura importa il set: l'IP serve al limite sugli import (vedi LimitatoreImport)
    @GetMapping("/{id}/carte")
    public CarteDTO carte(@PathVariable String id, @RequestParam(required = false) Integer pagina, HttpServletRequest request) {
        return espansioneService.carte(id, pagina, request.getRemoteAddr());
    }

    // a che punto è lo scaricamento (e, se è fermo, lo rilancia): il frontend lo chiede mentre mostra le pagine al volo
    @GetMapping("/{id}/carte/stato")
    public StatoCarteDTO stato(@PathVariable String id, HttpServletRequest request) {
        return espansioneService.stato(id, request.getRemoteAddr());
    }
}
