package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EspansioneService {

    private final EspansioneRepository espansioneRepository;
    private final OggettoRepository oggettoRepository;
    private final PokemonTcgService pokemonTcgService;
    private final ImportInBackground importInBackground;

    // set trovati senza carte: dopo quanto si richiedono a pokemontcg.io
    private static final Duration ATTESA_SET_VUOTO = Duration.ofHours(6);

    // set annunciati ma ancora senza carte: per qualche ora non si richiedono. Dopo un riavvio si riprova
    // subito, ed è al più una chiamata per set
    private final PromemoriaTemporaneo<String> setVuoti = new PromemoriaTemporaneo<>(ATTESA_SET_VUOTO);

    // vetrina vuota e sincronizzazione fallita: dopo quanto la si ritenta da una visita
    private static final Duration ATTESA_DOPO_SINCRONIZZAZIONE_FALLITA = Duration.ofMinutes(5);

    // una sola sincronizzazione alla volta dalle visite: con la vetrina vuota chi arriva insieme aspetta
    // e poi trova le espansioni già salvate, invece di chiamare pokemontcg.io ognuno per conto suo
    private final Object lockSincronizzazione = new Object();

    // sincronizzazione dell'elenco fallita da poco, da una visita: una chiave sola, l'elenco intero
    private static final String ELENCO = "elenco";
    private final PromemoriaTemporaneo<String> sincronizzazioneFallita =
            new PromemoriaTemporaneo<>(ATTESA_DOPO_SINCRONIZZAZIONE_FALLITA);

    // aggiorna l'elenco delle espansioni da pokemontcg.io: all'avvio e ogni notte (nuovi set)
    @Scheduled(cron = "0 30 4 * * *")
    public void sincronizza() {
        log.info("Espansioni sincronizzate: {}", pokemonTcgService.sincronizzaEspansioni());
    }

    public List<EspansioneResponseDTO> findAll() {
        // primo avvio con pokemontcg.io giù: si riprova alla prima visita della vetrina
        if (espansioneRepository.count() == 0) {
            sincronizzaDaVisita();
        }
        return espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc().stream()
                .map(EspansioneResponseDTO::from)
                .toList();
    }

    // Se fallisce, per qualche minuto le visite rispondono subito con lo stesso errore (502) invece di
    // rifare ognuna tutti i tentativi verso un'API ancora giù. Non una lista vuota: "nessuna espansione"
    // sarebbe falso. La sincronizzazione notturna e quella all'avvio non passano di qui
    private void sincronizzaDaVisita() {
        synchronized (lockSincronizzazione) {
            // ricontrollo: chi aspettava il lock trova le espansioni già salvate dalla visita prima
            if (espansioneRepository.count() > 0) {
                return;
            }
            if (sincronizzazioneFallita.isRecente(ELENCO)) {
                throw new ServizioEsternoException("Sincronizzazione delle espansioni fallita da poco: si riprova dopo "
                        + ATTESA_DOPO_SINCRONIZZAZIONE_FALLITA.toMinutes() + " minuti", null);
            }
            try {
                sincronizza();
                sincronizzazioneFallita.dimentica(ELENCO);
            } catch (ServizioEsternoException ex) {
                sincronizzazioneFallita.annota(ELENCO);
                throw ex;
            }
        }
    }

    // carte del set, ordinate per numero. Alla prima apertura solo la pagina chiesta (da 0), presa al volo da
    // pokemontcg.io, mentre il set intero si scarica in background. client: IP del visitatore, per il limite sugli import
    public CarteDTO carte(String id, Integer pagina, String client) {
        Espansione espansione = espansioneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Espansione " + id + " non trovata"));
        int numeroPagina = OrdineCarte.pagina(pagina);

        if (espansione.isImportata()) {
            return CarteDTO.completo(perNumero(oggettoRepository.findByEspansioneId(id)));
        }
        // set annunciato ma ancora senza carte su pokemontcg.io: per qualche ora non si richiede
        if (setVuoti.isRecente(id)) {
            return CarteDTO.completo(List.of());
        }
        PokemonTcgService.PaginaCarte alVolo = pokemonTcgService.paginaCarte("set.id:" + id, numeroPagina, "number");
        if (numeroPagina == 0 && alVolo.totale() == 0) {
            log.info("Set {} ancora senza carte su pokemontcg.io: si riprova tra {} ore", id, ATTESA_SET_VUOTO.toHours());
            setVuoti.annota(id);
            return CarteDTO.completo(List.of());
        }
        // dopo la pagina al volo: un set annunciato ma ancora vuoto non si scarica (fallirebbe e consumerebbe il limite)
        String chiave = "set:" + id;
        importInBackground.avvia(chiave, client,
                () -> !espansioneRepository.findById(id).map(Espansione::isImportata).orElse(false),
                () -> pokemonTcgService.importaSet(id));
        return new CarteDTO(false, alVolo.totale(), perNumero(alVolo.carte()), importInBackground.fallitoDaPoco(chiave));
    }

    private static List<OggettoResponseDTO> perNumero(List<Oggetto> carte) {
        return carte.stream()
                .sorted(Comparator.comparing(Oggetto::getNumero, NumeriCarta::confronta))
                .map(OggettoResponseDTO::from)
                .toList();
    }
}
