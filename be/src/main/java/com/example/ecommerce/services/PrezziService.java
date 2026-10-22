package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.FasciaPrezzoDTO;
import com.example.ecommerce.payloads.PrezziCartaDTO;
import com.example.ecommerce.payloads.TcgdexApi;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

// fascia di prezzo nel dettaglio di una carta, letta al momento da TCGdex (Cardmarket) e tenuta in memoria qualche
// ora: il prezzo salvato nel catalogo resta quello dell'import, usato da griglie e statistiche
@Service
@RequiredArgsConstructor
public class PrezziService {

    // Cardmarket aggiorna i prezzi una volta al giorno: qualche ora di memoria evita richieste ripetute
    private static final Duration DURATA_MEMORIA = Duration.ofHours(6);
    private static final PrezziCartaDTO NESSUNO = new PrezziCartaDTO(null, null, null);

    private final TcgdexClient tcgdex;
    private final OggettoRepository oggettoRepository;
    private final Map<String, Letti> letti = new ConcurrentHashMap<>();

    private record Letti(PrezziCartaDTO prezzi, Instant presiIl) {
    }

    public PrezziCartaDTO prezzi(UUID oggettoId) {
        Oggetto oggetto = oggettoRepository.findById(oggettoId)
                .orElseThrow(() -> new NotFoundException("Oggetto con id " + oggettoId + " non trovato"));
        String idEsterno = oggetto.getIdEsterno();
        if (idEsterno == null) {
            return NESSUNO;
        }
        Instant adesso = Instant.now();
        Letti trovati = letti.get(idEsterno);
        if (trovati != null && trovati.presiIl().isAfter(adesso.minus(DURATA_MEMORIA))) {
            return trovati.prezzi();
        }
        PrezziCartaDTO prezzi;
        try {
            prezzi = daCardmarket(tcgdex.dettaglio(idEsterno));
        } catch (NotFoundException e) {
            // carta che TCGdex non ha più: nessuna fascia, come per le carte senza prezzi
            prezzi = NESSUNO;
        }
        // via le scadute, così la mappa resta piccola (le carte aperte nelle ultime ore)
        letti.values().removeIf(vecchi -> vecchi.presiIl().isBefore(adesso.minus(DURATA_MEMORIA)));
        letti.put(idEsterno, new Letti(prezzi, adesso));
        return prezzi;
    }

    private static PrezziCartaDTO daCardmarket(TcgdexApi.Carta carta) {
        TcgdexApi.Cardmarket cm = carta.pricing() == null ? null : carta.pricing().cardmarket();
        if (cm == null) {
            return NESSUNO;
        }
        return new PrezziCartaDTO(
                fascia(cm.low(), cm.trend(), cm.avg(), cm.avg1(), cm.avg7(), cm.avg30()),
                fascia(cm.lowHolo(), cm.trendHolo(), cm.avgHolo(), cm.avg1Holo(), cm.avg7Holo(), cm.avg30Holo()),
                cm.updated());
    }

    // 0 e null valgono "non disponibile". Il minimo è l'offerta più bassa (senza, il valore più basso); il massimo il
    // più alto di tutti, offerta compresa: un'offerta sopra le medie allarga la fascia invece di rovesciarla.
    // null se non c'è nessun valore
    static FasciaPrezzoDTO fascia(BigDecimal low, BigDecimal trend, BigDecimal avg, BigDecimal avg1, BigDecimal avg7,
                                  BigDecimal avg30) {
        List<BigDecimal> valori = Stream.of(low, trend, avg, avg1, avg7, avg30).map(PrezziService::valido)
                .filter(Objects::nonNull).toList();
        if (valori.isEmpty()) {
            return null;
        }
        BigDecimal minimo = Objects.requireNonNullElseGet(valido(low), () -> valori.stream().min(Comparator.naturalOrder()).orElseThrow());
        return new FasciaPrezzoDTO(minimo, valori.stream().max(Comparator.naturalOrder()).orElseThrow(), valido(trend), valido(avg30));
    }

    private static BigDecimal valido(BigDecimal prezzo) {
        return prezzo == null || prezzo.signum() <= 0 ? null : prezzo.setScale(2, RoundingMode.HALF_UP);
    }
}
