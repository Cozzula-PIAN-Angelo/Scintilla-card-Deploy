package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
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
    private final CatalogoService catalogoService;
    private final ImportInBackground importInBackground;
    private final AllineamentoTcgdex allineamentoTcgdex;
    private final VetrinaService vetrinaService;

    // set trovati senza carte: dopo quanto si richiedono a TCGdex
    private static final Duration ATTESA_SET_VUOTO = Duration.ofHours(6);

    // set annunciati ma ancora senza carte: per qualche ora non si richiedono. Dopo un riavvio si riprova
    // subito, ed è al più una chiamata per set
    private final PromemoriaTemporaneo<String> setVuoti = new PromemoriaTemporaneo<>(ATTESA_SET_VUOTO);

    // vetrina vuota e sincronizzazione fallita: dopo quanto la si ritenta da una visita
    private static final Duration ATTESA_DOPO_SINCRONIZZAZIONE_FALLITA = Duration.ofMinutes(5);

    // una sola sincronizzazione alla volta dalle visite: con la vetrina vuota chi arriva insieme aspetta
    // e poi trova le espansioni già salvate, invece di chiamare TCGdex ognuno per conto suo
    private final Object lockSincronizzazione = new Object();

    // sincronizzazione dell'elenco fallita da poco, da una visita: una chiave sola, l'elenco intero
    private static final String ELENCO = "elenco";
    private final PromemoriaTemporaneo<String> sincronizzazioneFallita =
            new PromemoriaTemporaneo<>(ATTESA_DOPO_SINCRONIZZAZIONE_FALLITA);

    // aggiorna l'elenco delle espansioni da TCGdex, poi nomi e numeri delle carte (che usano nome e carte ufficiali
    // dei set appena scritti): all'avvio e ogni notte. Se l'allineamento fallisce i set restano salvati
    @Scheduled(cron = "0 30 4 * * *")
    public void sincronizza() {
        sincronizzaSet();
        try {
            allineamentoTcgdex.allinea();
        } catch (RuntimeException ex) {
            log.warn("Allineamento dei nomi delle carte fallito, si riprova la notte dopo: {}", ex.getMessage());
        }
    }

    // i set nuovi della home ancora senza carte (vedi VetrinaService.setDaScaricare) si scaricano senza aspettare la
    // prima visita alla loro pagina. Non è notturno perché Render (piano free) dorme: come RiempimentoVarianti,
    // poco dopo l'avvio e poi ogni ora. Senza niente da scaricare è una query sola
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT2M")
    public void scaricaSetNuovi() {
        for (String id : vetrinaService.setDaScaricare()) {
            if (setVuoti.isRecente(id)) {
                continue;
            }
            importInBackground.eseguiOra("set:" + id,
                    () -> !espansioneRepository.findById(id).map(Espansione::isImportata).orElse(false),
                    () -> scaricaSetNuovo(id));
        }
    }

    private void scaricaSetNuovo(String id) {
        try {
            log.info("Set nuovo della home scaricato: {}", catalogoService.importaSet(id));
        } catch (NotFoundException ex) {
            // annunciato ma ancora senza carte su TCGdex: come per le visite, per qualche ora non si richiede
            log.info("Set {} ancora senza carte su TCGdex: si riprova tra {} ore", id, ATTESA_SET_VUOTO.toHours());
            setVuoti.annota(id);
        }
    }

    private void sincronizzaSet() {
        log.info("Espansioni sincronizzate: {}", catalogoService.sincronizzaEspansioni());
    }

    public List<EspansioneResponseDTO> findAll() {
        // primo avvio con TCGdex giù: si riprova alla prima visita della vetrina
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
                sincronizzaSet();
                sincronizzazioneFallita.dimentica(ELENCO);
            } catch (ServizioEsternoException ex) {
                sincronizzazioneFallita.annota(ELENCO);
                throw ex;
            }
        }
    }

    // descrizione scritta dall'admin per la hero della home: spazi tolti, vuota = nessuna
    public EspansioneResponseDTO modificaDescrizione(String id, String descrizione) {
        Espansione espansione = espansioneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Espansione " + id + " non trovata"));
        String testo = descrizione == null ? null : descrizione.strip();
        espansione.setDescrizione(testo == null || testo.isEmpty() ? null : testo);
        return EspansioneResponseDTO.from(espansioneRepository.save(espansione));
    }

    // carte del set, ordinate per numero. Alla prima apertura solo la pagina chiesta (da 0), presa al volo da
    // TCGdex, mentre il set intero si scarica in background. client: IP del visitatore, per il limite sugli import
    public CarteDTO carte(String id, Integer pagina, String client) {
        Espansione espansione = espansioneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Espansione " + id + " non trovata"));
        int numeroPagina = OrdineCarte.pagina(pagina);

        if (espansione.isImportata()) {
            return CarteDTO.completo(perNumero(oggettoRepository.findByEspansioneId(id)));
        }
        // set annunciato ma ancora senza carte su TCGdex: per qualche ora non si richiede
        if (setVuoti.isRecente(id)) {
            return CarteDTO.completo(List.of());
        }
        CatalogoService.PaginaCarte alVolo = catalogoService.paginaCarte(FiltroCarte.diSet(id), numeroPagina, false);
        if (numeroPagina == 0 && alVolo.totale() == 0) {
            log.info("Set {} ancora senza carte su TCGdex: si riprova tra {} ore", id, ATTESA_SET_VUOTO.toHours());
            setVuoti.annota(id);
            return CarteDTO.completo(List.of());
        }
        // dopo la pagina al volo: un set annunciato ma ancora vuoto non si scarica (fallirebbe e consumerebbe il limite)
        String chiave = "set:" + id;
        importInBackground.avvia(chiave, client,
                () -> !espansioneRepository.findById(id).map(Espansione::isImportata).orElse(false),
                () -> catalogoService.importaSet(id));
        return new CarteDTO(false, alVolo.totale(), perNumero(alVolo.carte()), importInBackground.fallitoDaPoco(chiave));
    }

    // per il controllo periodico del frontend: niente chiamate esterne nella richiesta. Se lo scaricamento è fermo
    // (pausa dopo un errore finita, server riavviato) lo rilancia in background; col limite raggiunto niente 429
    public StatoCarteDTO stato(String id, String client) {
        Espansione espansione = espansioneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Espansione " + id + " non trovata"));
        boolean completo = espansione.isImportata() || setVuoti.isRecente(id);
        String chiave = "set:" + id;
        if (!completo) {
            try {
                importInBackground.avvia(chiave, client,
                        () -> !espansioneRepository.findById(id).map(Espansione::isImportata).orElse(false),
                        () -> catalogoService.importaSet(id));
            } catch (TroppeRichiesteException ex) {
                // si riprova al controllo dopo
            }
        }
        return new StatoCarteDTO(completo, !completo && importInBackground.fallitoDaPoco(chiave));
    }

    private static List<OggettoResponseDTO> perNumero(List<Oggetto> carte) {
        return carte.stream()
                .sorted(Comparator.comparing(Oggetto::getNumero, NumeriCarta::confronta))
                .map(OggettoResponseDTO::from)
                .toList();
    }
}
