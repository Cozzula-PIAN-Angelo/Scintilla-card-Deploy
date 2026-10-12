package com.example.ecommerce.services;

import com.example.ecommerce.entities.TokenRevocato;
import com.example.ecommerce.repositories.TokenRevocatoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRevocatoService {

    private final TokenRevocatoRepository tokenRevocatoRepository;

    @Transactional
    // jti: l'id del token (vedi JWTTools); scadenza: quella del token, per la pulizia notturna
    public void revoca(UUID jti, Instant scadenza) {
        // un secondo logout con lo stesso token non deve violare la chiave primaria
        if (!tokenRevocatoRepository.existsById(jti)) {
            tokenRevocatoRepository.save(new TokenRevocato(jti, scadenza));
        }
    }

    @Transactional(readOnly = true)
    public boolean isRevocato(UUID jti) {
        return tokenRevocatoRepository.existsById(jti);
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
