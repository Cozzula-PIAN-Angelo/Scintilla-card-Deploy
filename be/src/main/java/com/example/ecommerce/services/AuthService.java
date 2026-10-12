package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.UnauthorizedException;
import com.example.ecommerce.payloads.LoginDTO;
import com.example.ecommerce.payloads.LoginResponseDTO;
import com.example.ecommerce.repositories.UtenteRepository;
import com.example.ecommerce.security.JWTTools;
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

    private final UtenteRepository utenteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JWTTools jwtTools;
    private final TokenRevocatoService tokenRevocatoService;

    @Transactional(readOnly = true)
    public LoginResponseDTO login(LoginDTO body) {
        // stesso messaggio per utente inesistente e password errata:
        // non si rivela quali email o username sono registrati
        return cercaUtente(body.identificativo().trim())
                // un account cancellato non accede più (la password è comunque casuale: è una seconda difesa)
                .filter(utente -> !utente.isAnonimizzato())
                .filter(utente -> passwordEncoder.matches(body.password(), utente.getPassword()))
                .map(utente -> new LoginResponseDTO(jwtTools.generaToken(utente)))
                .orElseThrow(() -> new UnauthorizedException("Credenziali non valide"));
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
        tokenRevocatoService.revoca(token, jwtTools.estraiScadenza(token));
    }
}
