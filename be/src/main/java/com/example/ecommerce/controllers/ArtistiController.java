package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.ArtistaResponseDTO;
import com.example.ecommerce.payloads.CartaSimboloDTO;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.SceltaCartaSimboloDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
import com.example.ecommerce.payloads.VetrinaArtistiDTO;
import com.example.ecommerce.services.ArtistiService;
import com.example.ecommerce.services.VetrinaArtistiService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
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
    // il backend la ricalcola al massimo una volta l'ora, o subito dopo una scelta dell'admin: il browser la tiene
    // 5 minuti, così anche quella arriva presto a tutti
    @GetMapping("/anteprime")
    public ResponseEntity<VetrinaArtistiDTO> anteprime() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(vetrinaArtistiService.vetrina());
    }

    // solo admin: la carta simbolo dell'illustratore per il muro, scelta o automatica
    @GetMapping("/{slug}/carta-simbolo")
    @PreAuthorize("hasRole('ADMIN')")
    public CartaSimboloDTO cartaSimbolo(@PathVariable String slug) {
        return vetrinaArtistiService.cartaSimbolo(slug);
    }

    @PatchMapping("/{slug}/carta-simbolo")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void scegliCartaSimbolo(@PathVariable String slug, @RequestBody @Valid SceltaCartaSimboloDTO body) {
        vetrinaArtistiService.scegliCartaSimbolo(slug, body.idEsterno().trim());
    }

    // torna la scelta automatica
    @DeleteMapping("/{slug}/carta-simbolo")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void togliCartaSimbolo(@PathVariable String slug) {
        vetrinaArtistiService.togliCartaSimbolo(slug);
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
