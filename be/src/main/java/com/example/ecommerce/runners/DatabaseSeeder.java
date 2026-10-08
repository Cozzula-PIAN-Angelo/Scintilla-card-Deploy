package com.example.ecommerce.runners;

import com.example.ecommerce.entities.NomiRuolo;
import com.example.ecommerce.entities.Ruolo;
import com.example.ecommerce.entities.RuoloUtente;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.repositories.RuoloRepository;
import com.example.ecommerce.repositories.RuoloUtenteRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final RuoloRepository ruoloRepository;
    private final UtenteRepository utenteRepository;
    private final RuoloUtenteRepository ruoloUtenteRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminEmail;
    private final String adminPassword;

    public DatabaseSeeder(RuoloRepository ruoloRepository,
                          UtenteRepository utenteRepository,
                          RuoloUtenteRepository ruoloUtenteRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${admin.username}") String adminUsername,
                          @Value("${admin.email}") String adminEmail,
                          @Value("${admin.password}") String adminPassword) {
        this.ruoloRepository = ruoloRepository;
        this.utenteRepository = utenteRepository;
        this.ruoloUtenteRepository = ruoloUtenteRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        Ruolo ruoloUtente = creaRuoloSeMancante(NomiRuolo.UTENTE);
        Ruolo ruoloAdmin = creaRuoloSeMancante(NomiRuolo.ADMIN);

        // ADMIN_EMAIL può avere le maiuscole: si confronta e si salva come le email registrate
        String adminEmail = Utente.normalizzaEmail(this.adminEmail);
        if (utenteRepository.existsByEmailIgnoreCase(adminEmail)) {
            log.info("Seeder: admin con email {} già presente, salto", adminEmail);
            return;
        }
        if (utenteRepository.existsByUsername(adminUsername)) {
            log.warn("Seeder: lo username {} è già usato da un altro utente, admin non creato", adminUsername);
            return;
        }

        Utente admin = utenteRepository.save(
                new Utente(adminUsername, adminEmail, passwordEncoder.encode(adminPassword)));
        ruoloUtenteRepository.save(new RuoloUtente(admin, ruoloUtente));
        ruoloUtenteRepository.save(new RuoloUtente(admin, ruoloAdmin));
        log.info("Seeder: creato admin {} ({}) con ruoli UTENTE e ADMIN", adminUsername, adminEmail);
    }

    private Ruolo creaRuoloSeMancante(String nome) {
        return ruoloRepository.findByNome(nome)
                .map(ruolo -> {
                    log.info("Seeder: ruolo {} già presente, salto", nome);
                    return ruolo;
                })
                .orElseGet(() -> {
                    log.info("Seeder: creato ruolo {}", nome);
                    return ruoloRepository.save(new Ruolo(nome));
                });
    }
}
