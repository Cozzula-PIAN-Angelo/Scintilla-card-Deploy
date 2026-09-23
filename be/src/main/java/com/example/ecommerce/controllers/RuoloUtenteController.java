package com.example.ecommerce.controllers;

import com.example.ecommerce.services.RuoloUtenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/utenti")
@RequiredArgsConstructor
public class RuoloUtenteController {

    private final RuoloUtenteService ruoloUtenteService;

    @PostMapping("/{id}/ruoli/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assegnaAdmin(@PathVariable UUID id) {
        ruoloUtenteService.assegnaAdmin(id);
    }

    @DeleteMapping("/{id}/ruoli/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revocaAdmin(@PathVariable UUID id) {
        ruoloUtenteService.revocaAdmin(id);
    }
}
