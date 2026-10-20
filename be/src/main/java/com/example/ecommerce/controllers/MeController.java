package com.example.ecommerce.controllers;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.payloads.CambioPasswordDTO;
import com.example.ecommerce.payloads.CancellaAccountDTO;
import com.example.ecommerce.payloads.LoginResponseDTO;
import com.example.ecommerce.payloads.ModificaAccountDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.PreferitoResponseDTO;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.services.AccountService;
import com.example.ecommerce.services.CancellazioneUtenteService;
import com.example.ecommerce.services.PaginationHelper;
import com.example.ecommerce.services.PreferitoService;
import com.example.ecommerce.services.UtenteService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {

    private final PreferitoService preferitoService;
    private final UtenteService utenteService;
    private final CancellazioneUtenteService cancellazioneUtenteService;
    private final AccountService accountService;
    private final PaginationHelper paginationHelper;

    @GetMapping
    public UtenteResponseDTO getProfilo(@AuthenticationPrincipal Utente utente) {
        return utenteService.getProfilo(utente);
    }

    // cancella (anonimizza) il proprio account; il token usato smette subito di valere
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancellaAccount(@AuthenticationPrincipal Utente utente, @RequestBody @Valid CancellaAccountDTO body) {
        cancellazioneUtenteService.cancellaAccount(utente, body.password());
    }

    // username ed email; l'IP serve al limite sui tentativi con la password sbagliata (vedi LimitatoreLogin)
    @PatchMapping("/account")
    public UtenteResponseDTO modificaAccount(@AuthenticationPrincipal Utente utente,
                                             @RequestBody @Valid ModificaAccountDTO body,
                                             HttpServletRequest request) {
        return accountService.modifica(utente, body, request.getRemoteAddr());
    }

    // risponde con un token nuovo: quelli emessi prima, anche su altri dispositivi, non valgono più
    @PostMapping("/password")
    public LoginResponseDTO cambiaPassword(@AuthenticationPrincipal Utente utente,
                                           @RequestBody @Valid CambioPasswordDTO body,
                                           HttpServletRequest request) {
        return accountService.cambiaPassword(utente, body, request.getRemoteAddr());
    }

    @GetMapping("/preferiti")
    public PageResponse<PreferitoResponseDTO> getPreferiti(@AuthenticationPrincipal Utente utente,
                                                           @RequestParam(required = false) Integer page,
                                                           @RequestParam(required = false) Integer size,
                                                           @RequestParam(required = false) String sort) {
        return preferitoService.getPreferiti(utente, paginationHelper.perPreferiti(page, size, sort));
    }

    @GetMapping("/preferiti/ids")
    public List<UUID> getIdsPreferiti(@AuthenticationPrincipal Utente utente) {
        return preferitoService.getIdsPreferiti(utente);
    }
}
