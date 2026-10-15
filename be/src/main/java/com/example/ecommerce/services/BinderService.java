package com.example.ecommerce.services;

import com.example.ecommerce.entities.Binder;
import com.example.ecommerce.entities.ImmagineBinder;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.SlotBinder;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.BinderDTO;
import com.example.ecommerce.payloads.BinderDettaglioDTO;
import com.example.ecommerce.payloads.BinderResponseDTO;
import com.example.ecommerce.payloads.CopiaDTO;
import com.example.ecommerce.payloads.CriterioOrdine;
import com.example.ecommerce.payloads.DisposizioneSlotDTO;
import com.example.ecommerce.payloads.InserisciCartaDTO;
import com.example.ecommerce.payloads.SlotBinderResponseDTO;
import com.example.ecommerce.payloads.SpostaCartaDTO;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.ImmagineBinderRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.SlotBinderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// l'Utente arriva sempre dal token: ogni binder si cerca per id E proprietario,
// quindi quello di un altro utente risponde 404 come se non esistesse
@Service
@RequiredArgsConstructor
public class BinderService {

    private static final Set<Integer> TASCHE_AMMESSE = Set.of(4, 9, 12);
    // il browser ridimensiona e comprime prima dell'invio: ne arrivano 100-300 KB
    public static final int DIMENSIONE_MASSIMA_IMMAGINE = 1024 * 1024;

    private final BinderRepository binderRepository;
    private final SlotBinderRepository slotRepository;
    private final ImmagineBinderRepository immagineRepository;
    private final OggettoRepository oggettoRepository;
    private final CollezioneService collezioneService;

    @Transactional(readOnly = true)
    public List<BinderResponseDTO> getBinder(Utente utente) {
        Map<UUID, Long> carte = slotRepository.contaCartePerBinder(utente.getId()).stream()
                .collect(Collectors.toMap(riga -> (UUID) riga[0], riga -> (Long) riga[1]));
        return binderRepository.findByUtenteIdOrderByCreatedAtAsc(utente.getId()).stream()
                .map(binder -> BinderResponseDTO.from(binder, carte.getOrDefault(binder.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public BinderDettaglioDTO getDettaglio(Utente utente, UUID id) {
        Binder binder = findBinder(utente, id);
        List<SlotBinderResponseDTO> slot = slotRepository.findByBinderIdOrderByPaginaAscPosizioneAsc(id).stream()
                .map(SlotBinderResponseDTO::from)
                .toList();
        // copie delle sole carte nelle tasche, una volta per carta anche se compare in più tasche
        Set<UUID> carte = slot.stream().map(s -> s.oggetto().id()).collect(Collectors.toSet());
        List<CopiaDTO> collezione = collezioneService.copieDelleCarte(utente, carte);
        return new BinderDettaglioDTO(BinderResponseDTO.from(binder, slot.size()), slot, collezione);
    }

    @Transactional
    public BinderResponseDTO crea(Utente utente, BinderDTO body) {
        controllaTasche(body.tasche());
        List<Oggetto> carte = body.espansioneId() == null ? List.of() : carteDelSet(body.espansioneId());
        int pagine = body.espansioneId() == null ? body.pagine() : pagineChecklist(carte.size(), body.tasche());
        Binder binder = new Binder(utente, body.nome().trim(), body.tasche(), pagine, body.colore().toLowerCase(), body.motivo());
        binder.setMostraMancanti(body.mostraMancanti());
        binder.setCartaCopertina(cartaCopertina(body.cartaCopertinaId()));
        // flush immediato: così createdAt è valorizzato nella risposta
        binderRepository.saveAndFlush(binder);
        riscrivi(binder, new TreeMap<>(), compatte(carte));
        return BinderResponseDTO.from(binder, carte.size());
    }

    // carte del set in ordine di numero, per il binder checklist
    private List<Oggetto> carteDelSet(String espansioneId) {
        List<Oggetto> carte = oggettoRepository.findByEspansioneId(espansioneId).stream()
                .sorted(OrdineCarte.comparatore(CriterioOrdine.SET_NUMERO))
                .toList();
        if (carte.isEmpty()) {
            throw new BadRequestException("Il set non ha ancora carte nel catalogo");
        }
        return carte;
    }

    private static int pagineChecklist(int carte, int tasche) {
        int pagine = Math.max(2, (carte + tasche - 1) / tasche);
        if (pagine > 60) {
            throw new BadRequestException("Il set non ci sta: scegli più tasche");
        }
        return pagine;
    }

    @Transactional
    public BinderResponseDTO modifica(Utente utente, UUID id, BinderDTO body) {
        Binder binder = findBinder(utente, id);
        controllaTasche(body.tasche());

        // pagine e tasche si possono ridurre solo se le tasche che sparirebbero sono vuote
        long fuori = slotRepository.contaFuoriDa(id, body.pagine(), body.tasche());
        if (fuori > 0) {
            throw new ConflictException(fuori == 1
                    ? "Una carta resterebbe fuori dal binder ridimensionato: spostala o toglila prima"
                    : fuori + " carte resterebbero fuori dal binder ridimensionato: spostale o toglile prima");
        }

        binder.setNome(body.nome().trim());
        binder.setTasche(body.tasche());
        binder.setPagine(body.pagine());
        binder.setColore(body.colore().toLowerCase());
        binder.setMotivo(body.motivo());
        binder.setMostraMancanti(body.mostraMancanti());
        binder.setCartaCopertina(cartaCopertina(body.cartaCopertinaId()));

        // entity gestita: le modifiche vengono salvate al commit
        return BinderResponseDTO.from(binder, slotRepository.countByBinderId(id));
    }

    @Transactional
    public void cancella(Utente utente, UUID id) {
        // tasche e immagine le elimina il DB (ON DELETE CASCADE)
        binderRepository.delete(findBinder(utente, id));
    }

    @Transactional
    public SlotBinderResponseDTO inserisci(Utente utente, UUID id, InserisciCartaDTO body) {
        Binder binder = findBinder(utente, id);
        controllaPosizione(binder, body.pagina(), body.posizione());
        Oggetto oggetto = oggettoRepository.findById(body.oggettoId())
                .orElseThrow(() -> new NotFoundException("Carta con id " + body.oggettoId() + " non trovata"));

        if (Boolean.TRUE.equals(body.faiSpazio())) {
            TreeMap<Integer, Oggetto> prima = tasche(binder);
            riscrivi(binder, prima, Disposizione.inserisci(prima, totale(binder), indice(binder, body.pagina(), body.posizione()), oggetto));
            return slotRepository.findByBinderIdAndPaginaAndPosizione(id, body.pagina(), body.posizione())
                    .map(SlotBinderResponseDTO::from)
                    .orElseThrow();
        }
        SlotBinder slot = slotRepository.findByBinderIdAndPaginaAndPosizione(id, body.pagina(), body.posizione())
                .orElseGet(() -> new SlotBinder(binder, body.pagina(), body.posizione(), oggetto));
        slot.setOggetto(oggetto);
        return SlotBinderResponseDTO.from(slotRepository.save(slot));
    }

    @Transactional
    public void svuota(Utente utente, UUID id, int pagina, int posizione, boolean faiSpazio) {
        Binder binder = findBinder(utente, id);
        SlotBinder slot = slotRepository.findByBinderIdAndPaginaAndPosizione(id, pagina, posizione)
                .orElseThrow(() -> new NotFoundException("La tasca " + (posizione + 1) + " di pagina " + (pagina + 1) + " è già vuota"));
        if (faiSpazio) {
            TreeMap<Integer, Oggetto> prima = tasche(binder);
            riscrivi(binder, prima, Disposizione.togli(prima, totale(binder), indice(binder, pagina, posizione)));
            return;
        }
        slotRepository.delete(slot);
    }

    @Transactional
    public void sposta(Utente utente, UUID id, SpostaCartaDTO body) {
        Binder binder = findBinder(utente, id);
        controllaPosizione(binder, body.daPagina(), body.daPosizione());
        controllaPosizione(binder, body.aPagina(), body.aPosizione());
        if (body.daPagina().equals(body.aPagina()) && body.daPosizione().equals(body.aPosizione())) {
            return;
        }

        SlotBinder partenza = slotRepository.findByBinderIdAndPaginaAndPosizione(id, body.daPagina(), body.daPosizione())
                .orElseThrow(() -> new NotFoundException("Nella tasca di partenza non c'è nessuna carta"));
        if (Boolean.TRUE.equals(body.faiSpazio())) {
            TreeMap<Integer, Oggetto> prima = tasche(binder);
            riscrivi(binder, prima, Disposizione.sposta(prima, totale(binder),
                    indice(binder, body.daPagina(), body.daPosizione()), indice(binder, body.aPagina(), body.aPosizione())));
            return;
        }
        slotRepository.findByBinderIdAndPaginaAndPosizione(id, body.aPagina(), body.aPosizione())
                .ifPresentOrElse(
                        // arrivo occupato: si scambiano le carte, le righe restano dove sono.
                        // Così non si passa mai per due righe nella stessa posizione (vincolo UNIQUE)
                        arrivo -> {
                            Oggetto carta = arrivo.getOggetto();
                            arrivo.setOggetto(partenza.getOggetto());
                            partenza.setOggetto(carta);
                        },
                        () -> {
                            partenza.setPagina(body.aPagina());
                            partenza.setPosizione(body.aPosizione());
                        });
    }

    // tutte le carte, comprese le copie, tornano compatte dalla prima tasca nell'ordine del criterio
    @Transactional
    public List<SlotBinderResponseDTO> riordina(Utente utente, UUID id, CriterioOrdine criterio) {
        Binder binder = findBinder(utente, id);
        TreeMap<Integer, Oggetto> prima = tasche(binder);
        List<Oggetto> carte = prima.values().stream().sorted(OrdineCarte.comparatore(criterio)).toList();
        riscrivi(binder, prima, compatte(carte));
        return slot(id);
    }

    // sostituisce tutte le tasche con quelle ricevute: serve all'Annulla del riordino
    @Transactional
    public List<SlotBinderResponseDTO> ripristina(Utente utente, UUID id, List<DisposizioneSlotDTO> body) {
        Binder binder = findBinder(utente, id);
        Map<UUID, Oggetto> trovate = oggettoRepository.findAllById(body.stream().map(DisposizioneSlotDTO::oggettoId).toList()).stream()
                .collect(Collectors.toMap(Oggetto::getId, Function.identity()));
        TreeMap<Integer, Oggetto> dopo = new TreeMap<>();
        for (DisposizioneSlotDTO s : body) {
            controllaPosizione(binder, s.pagina(), s.posizione());
            Oggetto oggetto = trovate.get(s.oggettoId());
            if (oggetto == null) {
                throw new NotFoundException("Carta con id " + s.oggettoId() + " non trovata");
            }
            if (dopo.put(indice(binder, s.pagina(), s.posizione()), oggetto) != null) {
                throw new BadRequestException("Due carte nella stessa tasca");
            }
        }
        riscrivi(binder, tasche(binder), dopo);
        return slot(id);
    }

    @Transactional
    public BinderResponseDTO salvaImmagine(Utente utente, UUID id, byte[] contenuto) {
        Binder binder = findBinder(utente, id);
        if (contenuto == null || contenuto.length == 0) {
            throw new BadRequestException("L'immagine è vuota");
        }
        if (contenuto.length > DIMENSIONE_MASSIMA_IMMAGINE) {
            throw new BadRequestException("L'immagine supera 1 MB");
        }
        // il tipo si ricava dai primi byte, non dall'header: così si salvano solo immagini vere
        String contentType = tipoImmagine(contenuto);

        ImmagineBinder immagine = immagineRepository.findById(id)
                .orElseGet(() -> new ImmagineBinder(binder, contenuto, contentType));
        immagine.setContenuto(contenuto);
        immagine.setContentType(contentType);
        immagineRepository.save(immagine);
        binder.setImmagineAggiornataIl(Instant.now());
        return BinderResponseDTO.from(binder, slotRepository.countByBinderId(id));
    }

    @Transactional
    public BinderResponseDTO rimuoviImmagine(Utente utente, UUID id) {
        Binder binder = findBinder(utente, id);
        immagineRepository.findById(id).ifPresent(immagineRepository::delete);
        binder.setImmagineAggiornataIl(null);
        return BinderResponseDTO.from(binder, slotRepository.countByBinderId(id));
    }

    @Transactional(readOnly = true)
    public ImmagineBinder getImmagine(Utente utente, UUID id) {
        findBinder(utente, id);
        return immagineRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Questo binder non ha un'immagine di copertina"));
    }

    private Binder findBinder(Utente utente, UUID id) {
        return binderRepository.findByIdAndUtenteId(id, utente.getId())
                .orElseThrow(() -> new NotFoundException("Binder con id " + id + " non trovato"));
    }

    // tasche occupate come mappa indice lineare (pagina * tasche + posizione) -> carta
    private TreeMap<Integer, Oggetto> tasche(Binder binder) {
        TreeMap<Integer, Oggetto> tasche = new TreeMap<>();
        slotRepository.findByBinderIdOrderByPaginaAscPosizioneAsc(binder.getId())
                .forEach(s -> tasche.put(indice(binder, s.getPagina(), s.getPosizione()), s.getOggetto()));
        return tasche;
    }

    private static TreeMap<Integer, Oggetto> compatte(List<Oggetto> carte) {
        TreeMap<Integer, Oggetto> tasche = new TreeMap<>();
        for (int i = 0; i < carte.size(); i++) {
            tasche.put(i, carte.get(i));
        }
        return tasche;
    }

    private static int indice(Binder binder, int pagina, int posizione) {
        return pagina * binder.getTasche() + posizione;
    }

    private static int totale(Binder binder) {
        return binder.getPagine() * binder.getTasche();
    }

    // riscrive solo le tasche che cambiano. Prima si cancellano e si manda la DELETE al DB (flush), poi si
    // inseriscono le nuove: Hibernate altrimenti farebbe gli INSERT prima e violerebbe il vincolo UNIQUE
    private void riscrivi(Binder binder, SortedMap<Integer, Oggetto> prima, SortedMap<Integer, Oggetto> dopo) {
        Set<Integer> cambiate = new HashSet<>();
        prima.forEach((i, carta) -> {
            Oggetto nuova = dopo.get(i);
            if (nuova == null || !nuova.getId().equals(carta.getId())) cambiate.add(i);
        });
        dopo.forEach((i, carta) -> {
            if (!prima.containsKey(i)) cambiate.add(i);
        });
        if (cambiate.isEmpty()) {
            return;
        }
        List<SlotBinder> vecchie = slotRepository.findByBinderIdOrderByPaginaAscPosizioneAsc(binder.getId()).stream()
                .filter(s -> cambiate.contains(indice(binder, s.getPagina(), s.getPosizione())))
                .toList();
        slotRepository.deleteAll(vecchie);
        slotRepository.flush();
        slotRepository.saveAll(cambiate.stream()
                .filter(dopo::containsKey)
                .map(i -> new SlotBinder(binder, i / binder.getTasche(), i % binder.getTasche(), dopo.get(i)))
                .toList());
    }

    private List<SlotBinderResponseDTO> slot(UUID binderId) {
        return slotRepository.findByBinderIdOrderByPaginaAscPosizioneAsc(binderId).stream()
                .map(SlotBinderResponseDTO::from)
                .toList();
    }

    private Oggetto cartaCopertina(UUID oggettoId) {
        if (oggettoId == null) {
            return null;
        }
        return oggettoRepository.findById(oggettoId)
                .orElseThrow(() -> new NotFoundException("Carta con id " + oggettoId + " non trovata"));
    }

    private void controllaTasche(int tasche) {
        if (!TASCHE_AMMESSE.contains(tasche)) {
            throw new BadRequestException("Tasche per pagina non valide: valori ammessi 4, 9 o 12");
        }
    }

    private void controllaPosizione(Binder binder, int pagina, int posizione) {
        if (pagina >= binder.getPagine()) {
            throw new BadRequestException("Il binder ha solo " + binder.getPagine() + " pagine");
        }
        if (posizione >= binder.getTasche()) {
            throw new BadRequestException("Ogni pagina ha solo " + binder.getTasche() + " tasche");
        }
    }

    private String tipoImmagine(byte[] b) {
        if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "image/png";
        }
        if (b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        throw new BadRequestException("Formato non supportato: carica un'immagine JPEG, PNG o WebP");
    }
}
