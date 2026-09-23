package com.example.ecommerce.controllers;

import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.services.PaginationHelper;
import com.example.ecommerce.services.UtenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/utenti")
@RequiredArgsConstructor
public class UtenteController {

    private final UtenteService utenteService;
    private final PaginationHelper paginationHelper;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<UtenteResponseDTO> findAll(@RequestParam(required = false) Integer page,
                                                   @RequestParam(required = false) Integer size) {
        return utenteService.findAll(paginationHelper.perUtenti(page, size));
    }
}
