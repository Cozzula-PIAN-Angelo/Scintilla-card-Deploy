package com.example.ecommerce.controllers;

import com.example.ecommerce.entities.AvatarProfilo;
import com.example.ecommerce.services.ProfiloService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

// immagine profilo, pubblica: l'URL contiene l'UUID dell'utente (non indovinabile) e la versione (?v=...),
// quindi il frontend la mostra con un semplice <img> e il browser la tiene in cache finché non cambia
@RestController
@RequestMapping("/avatar")
@RequiredArgsConstructor
public class AvatarController {

    private final ProfiloService profiloService;

    @GetMapping("/{idUtente}")
    public ResponseEntity<byte[]> getAvatar(@PathVariable UUID idUtente) {
        AvatarProfilo avatar = profiloService.getAvatar(idUtente);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(avatar.getContenuto());
    }
}
