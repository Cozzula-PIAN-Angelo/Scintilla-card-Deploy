package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.services.EspansioneService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// vetrina pubblica: espansioni e carte di ciascuna
@RestController
@RequestMapping("/espansioni")
@RequiredArgsConstructor
public class EspansioneController {

    private final EspansioneService espansioneService;

    @GetMapping
    public List<EspansioneResponseDTO> findAll() {
        return espansioneService.findAll();
    }

    // la prima apertura importa il set: l'IP serve al limite sugli import (vedi LimitatoreImport)
    @GetMapping("/{id}/carte")
    public List<OggettoResponseDTO> carte(@PathVariable String id, HttpServletRequest request) {
        return espansioneService.carte(id, request.getRemoteAddr());
    }
}
