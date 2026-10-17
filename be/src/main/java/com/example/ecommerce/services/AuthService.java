package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.UnauthorizedException;
import com.example.ecommerce.payloads.LoginDTO;
import com.example.ecommerce.payloads.LoginResponseDTO;
import com.example.ecommerce.repositories.UtenteRepository;
import com.example.ecommerce.security.JWTTools;
import com.example.ecommerce.security.TokenVerificato;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class AuthService {

    // hash BCrypt (costo 10, come PasswordConfig) di una stringa casuale buttata via: non corrisponde
    // a nessuna password, serve solo a far durare il login di un'utenza inesistente quanto gli altri
    private static final String HASH_FINTO = "$2a$10$SlQDl6I8sQ6Ad1bwX3MqbexLWI8bOGSnMo6QVVwB/DywgVPH3XSji";

    private final UtenteRepository utenteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JWTTools jwtTools;
    private final TokenRevocatoService tokenRevocatoService;
    private final LimitatoreLogin limitatoreLogin;

    @Transactional(readOnly = true)
    public LoginResponseDTO login(LoginDTO body, String ip) {
        String identificativo = body.identificativo().trim();
        // oltre il limite dei tentativi falliti la password non si controlla nemmeno (429)
        limitatoreLogin.controlla(ip, identificativo);
        // stesso messaggio per utente inesistente e password errata:
        // non si rivela quali email o username sono registrati
        Optional<Utente> utente = cercaUtente(identificativo)
                // un account cancellato non accede più (la password è comunque casuale: è una seconda difesa)
                .filter(trovato -> !trovato.isAnonimizzato());
        // BCrypt gira sempre, anche senza utente: altrimenti la risposta più veloce rivelerebbe
        // che l'account non esiste
        boolean passwordGiusta = passwordEncoder.matches(body.password(),
                utente.map(Utente::getPassword).orElse(HASH_FINTO));
        if (utente.isEmpty() || !passwordGiusta) {
            limitatoreLogin.fallito(ip, identificativo);
            throw new UnauthorizedException("Credenziali non valide");
        }
        limitatoreLogin.riuscito(identificativo);
        return new LoginResponseDTO(jwtTools.generaToken(utente.get()));
    }

    // Gli username non possono contenere '@' (RegistrazioneDTO): con la chiocciola è un'email, senza è uno username.
    // Entrambi ignorano maiuscole e minuscole, come in registrazione
    private Optional<Utente> cercaUtente(String identificativo) {
        return identificativo.contains("@")
                ? unico(utenteRepository.findByEmailIgnoreCase(identificativo), identificativo, Utente::getEmail)
                : unico(utenteRepository.findByUsernameIgnoreCase(identificativo), identificativo, Utente::getUsername);
    }

    // due account vecchi, registrati prima della regola, uguali a meno delle maiuscole: vale quello
    // scritto esattamente così
    private Optional<Utente> unico(List<Utente> trovati, String identificativo, Function<Utente, String> campo) {
        if (trovati.size() == 1) {
            return Optional.of(trovati.get(0));
        }
        return trovati.stream().filter(utente -> campo.apply(utente).equals(identificativo)).findFirst();
    }

    // il token è già stato validato dal JWTFilter prima di arrivare qui
    public void logout(String token) {
        TokenVerificato verificato = jwtTools.verifica(token);
        tokenRevocatoService.revoca(verificato.jti(), verificato.scadenza());
    }
}
