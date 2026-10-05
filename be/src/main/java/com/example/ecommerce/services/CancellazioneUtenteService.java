package com.example.ecommerce.services;

import com.example.ecommerce.entities.NomiRuolo;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.ImmagineBinderRepository;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

// Cancellazione di un account come anonimizzazione: la riga dell'utente resta, con lo stesso id,
// così preferiti e binder restano collegati e le statistiche non cambiano. Spariscono i dati
// personali: username, email, password, immagini di copertina caricate e nomi dei binder.
// I token già emessi smettono di valere subito: il JWTFilter rifiuta gli account anonimizzati
@Slf4j
@Service
@RequiredArgsConstructor
public class CancellazioneUtenteService {

    private static final String NOME_BINDER_ANONIMO = "Binder";

    private final UtenteRepository utenteRepository;
    private final RuoloUtenteRepository ruoloUtenteRepository;
    private final BinderRepository binderRepository;
    private final ImmagineBinderRepository immagineRepository;
    private final PasswordEncoder passwordEncoder;

    // l'utente cancella il proprio account: serve la password, così un token rubato non basta
    @Transactional
    public void cancellaAccount(Utente utente, String password) {
        Utente attuale = trovaAttivo(utente.getId());
        if (!passwordEncoder.matches(password, attuale.getPassword())) {
            // 400 e non 401: per il frontend un 401 significa "sessione scaduta"
            throw new BadRequestException("Password errata");
        }
        anonimizza(attuale);
    }

    // l'admin cancella l'account di un altro utente
    @Transactional
    public void cancellaUtente(UUID id) {
        anonimizza(trovaAttivo(id));
    }

    // un account già anonimizzato risulta inesistente
    private Utente trovaAttivo(UUID id) {
        return utenteRepository.findById(id)
                .filter(utente -> !utente.isAnonimizzato())
                .orElseThrow(() -> new NotFoundException("Utente con id " + id + " non trovato"));
    }

    private void anonimizza(Utente utente) {
        UUID id = utente.getId();

        // il ruolo ADMIN si toglie, ma mai all'ultimo admin rimasto (come in RuoloUtenteService)
        ruoloUtenteRepository.findByUtenteIdAndRuoloNome(id, NomiRuolo.ADMIN).ifPresent(ruoloAdmin -> {
            if (ruoloUtenteRepository.countByRuoloNome(NomiRuolo.ADMIN) <= 1) {
                throw new ConflictException("Impossibile cancellare l'account di " + utente.getUsername()
                        + ": è l'ultimo admin rimasto. Nomina prima un altro admin");
            }
            ruoloUtenteRepository.delete(ruoloAdmin);
        });

        // segnaposto unici e non riutilizzabili: senza '@' nello username (vedi RegistrazioneDTO)
        // e con il dominio riservato .invalid, che non riceve posta. Email e username originali
        // tornano liberi per una nuova registrazione
        String segnaposto = "eliminato-" + id;
        utente.setUsername(segnaposto);
        utente.setEmail(segnaposto + "@anonimo.invalid");
        // hash di una password casuale mai comunicata a nessuno: con questo account non si accede più
        utente.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        utente.setAnonimizzatoIl(Instant.now());

        immagineRepository.deleteByUtenteId(id);
        binderRepository.anonimizzaByUtenteId(id, NOME_BINDER_ANONIMO);

        // solo l'id: username ed email sono proprio i dati da non conservare
        log.info("Account {} anonimizzato", id);
    }
}
