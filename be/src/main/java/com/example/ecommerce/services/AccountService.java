package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.CambioPasswordDTO;
import com.example.ecommerce.payloads.LoginResponseDTO;
import com.example.ecommerce.payloads.ModificaAccountDTO;
import com.example.ecommerce.payloads.UtenteResponseDTO;
import com.example.ecommerce.repositories.UtenteRepository;
import com.example.ecommerce.security.JWTTools;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// modifica dell'account dalle impostazioni: username, email e password, sempre confermati dalla password attuale.
// I tentativi con la password sbagliata contano nel LimitatoreLogin, come un login fallito: un token rubato
// non serve a indovinarla
@Service
@RequiredArgsConstructor
public class AccountService {

    private final UtenteRepository utenteRepository;
    private final UtenteService utenteService;
    private final PasswordEncoder passwordEncoder;
    private final LimitatoreLogin limitatoreLogin;
    private final JWTTools jwtTools;

    @Transactional
    public UtenteResponseDTO modifica(Utente utente, ModificaAccountDTO body, String ip) {
        Utente attuale = attivo(utente.getId());
        // prima dei controlli su username ed email: senza la password non si scopre se sono già usati
        controllaPassword(attuale, body.passwordAttuale(), ip);

        String username = UtenteService.usernamePulito(body.username());
        if (usatoDaUnAltro(utenteRepository.findByUsernameIgnoreCase(username), attuale.getId())) {
            throw new ConflictException("Lo username '" + username + "' è già in uso");
        }
        String email = Utente.normalizzaEmail(body.email());
        if (usatoDaUnAltro(utenteRepository.findByEmailIgnoreCase(email), attuale.getId())) {
            throw new ConflictException("L'email '" + email + "' è già registrata");
        }
        attuale.setUsername(username);
        attuale.setEmail(email);
        return utenteService.getProfilo(utenteRepository.save(attuale));
    }

    // risponde con un token nuovo: gli altri dispositivi vengono disconnessi (JWTFilter), questo no
    @Transactional
    public LoginResponseDTO cambiaPassword(Utente utente, CambioPasswordDTO body, String ip) {
        Utente attuale = attivo(utente.getId());
        controllaPassword(attuale, body.passwordAttuale(), ip);
        UtenteService.controllaBytePassword(body.nuovaPassword());

        attuale.setPassword(passwordEncoder.encode(body.nuovaPassword()));
        attuale.setPasswordCambiataIl(Instant.now());
        return new LoginResponseDTO(jwtTools.generaToken(utenteRepository.save(attuale)));
    }

    // il principal arriva dal JWTFilter fuori da questa transazione: si rilegge per modificarlo
    private Utente attivo(UUID id) {
        return utenteRepository.findById(id)
                .filter(utente -> !utente.isAnonimizzato())
                .orElseThrow(() -> new NotFoundException("Utente con id " + id + " non trovato"));
    }

    // 400 e non 401: per il frontend un 401 significa "sessione scaduta"
    private void controllaPassword(Utente utente, String password, String ip) {
        limitatoreLogin.controlla(ip, utente.getEmail());
        if (!passwordEncoder.matches(password, utente.getPassword())) {
            limitatoreLogin.fallito(ip, utente.getEmail());
            throw new BadRequestException("Password errata");
        }
        limitatoreLogin.riuscito(utente.getEmail());
    }

    // "mario" -> "Mario" trova l'utente stesso: non è un conflitto
    private static boolean usatoDaUnAltro(List<Utente> trovati, UUID id) {
        return trovati.stream().anyMatch(trovato -> !trovato.getId().equals(id));
    }
}
