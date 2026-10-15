package com.example.ecommerce.controllers;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.payloads.StatisticheDTO;
import com.example.ecommerce.services.StatisticheService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// statistiche della collezione dell'utente autenticato
@RestController
@RequestMapping("/me/statistiche")
@RequiredArgsConstructor
public class StatisticheController {

    private final StatisticheService statisticheService;

    @GetMapping
    public StatisticheDTO getStatistiche(@AuthenticationPrincipal Utente utente) {
        return statisticheService.statistiche(utente);
    }
}
