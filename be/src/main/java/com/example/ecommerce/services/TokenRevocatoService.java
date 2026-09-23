package com.example.ecommerce.services;

import com.example.ecommerce.entities.TokenRevocato;
import com.example.ecommerce.repositories.TokenRevocatoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRevocatoService {

    private final TokenRevocatoRepository tokenRevocatoRepository;

    @Transactional
    public void revoca(String token, Instant scadenza) {
        // un secondo logout con lo stesso token non deve violare il vincolo UNIQUE
        if (!tokenRevocatoRepository.existsByToken(token)) {
            tokenRevocatoRepository.save(new TokenRevocato(token, scadenza));
        }
    }

    @Transactional(readOnly = true)
    public boolean isRevocato(String token) {
        return tokenRevocatoRepository.existsByToken(token);
    }

    // ogni giorno alle 3:00. Un token scaduto viene già rifiutato dalla validazione del JWT,
    // quindi non serve più tenerlo in blacklist
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void pulisciTokenScaduti() {
        long eliminati = tokenRevocatoRepository.deleteByScadenzaBefore(Instant.now());
        log.info("Pulizia blacklist: eliminati {} token scaduti", eliminati);
    }
}
