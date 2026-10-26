package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.ArtistaResponseDTO;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
import com.example.ecommerce.payloads.VetrinaArtistiDTO;
import com.example.ecommerce.services.ArtistiService;
import com.example.ecommerce.services.VetrinaArtistiService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

// indice per artista: gli illustratori delle carte e tutte le carte di ognuno
@RestController
@RequestMapping("/artisti")
@RequiredArgsConstructor
public class ArtistiController {

    private final ArtistiService artistiService;
    private final VetrinaArtistiService vetrinaArtistiService;

    // l'elenco cambia solo con un nuovo artisti.json, cioè a ogni deploy: il browser lo tiene un'ora
    @GetMapping
    public ResponseEntity<List<ArtistaResponseDTO>> elenco() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(artistiService.elenco());
    }

    // illustratori sul muro questa settimana e le prime carte di ognuno per l'indice, dalle carte già in archivio
    // il backend la ricalcola al massimo una volta l'ora: il browser la tiene altrettanto
    @GetMapping("/anteprime")
    public ResponseEntity<VetrinaArtistiDTO> anteprime() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(vetrinaArtistiService.vetrina());
    }

    // la prima apertura importa le carte dell'artista: l'IP serve al limite sugli import (vedi LimitatoreImport)
    @GetMapping("/{slug}/carte")
    public CarteDTO carte(@PathVariable String slug, @RequestParam(required = false) Integer pagina,
                          HttpServletRequest request) {
        return artistiService.carte(slug, pagina, request.getRemoteAddr());
    }

    // a che punto è lo scaricamento (e, se è fermo, lo rilancia): il frontend lo chiede mentre mostra le pagine al volo
    @GetMapping("/{slug}/carte/stato")
    public StatoCarteDTO stato(@PathVariable String slug, HttpServletRequest request) {
        return artistiService.stato(slug, request.getRemoteAddr());
    }
}
