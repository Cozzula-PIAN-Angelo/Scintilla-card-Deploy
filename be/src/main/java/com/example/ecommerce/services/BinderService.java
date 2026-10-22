package com.example.ecommerce.services;

import com.example.ecommerce.entities.Binder;
import com.example.ecommerce.entities.ImmagineBinder;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.SlotBinder;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.entities.Variante;
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
import com.example.ecommerce.payloads.OggettoResponseDTO;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// l'Utente arriva sempre dal token: ogni binder si cerca per id E proprietario,
// quindi quello di un altro utente risponde 404 come se non esistesse
@Service
@RequiredArgsConstructor
public class BinderService {

    private static final Set<Integer> TASCHE_AMMESSE = Set.of(4, 9, 12);
    // come il @Max di BinderDTO: con 12 tasche ci stanno 1800 carte, anche l'artista con più carte (5ban Graphics, 1651)
    private static final int PAGINE_MASSIME = 150;

    private final BinderRepository binderRepository;
    private final SlotBinderRepository slotRepository;
    private final ImmagineBinderRepository immagineRepository;
    private final OggettoRepository oggettoRepository;
    private final CollezioneService collezioneService;
    private final ElencoArtisti elencoArtisti;

    // contenuto di una tasca: la carta e, nel binder del master set, la sua variante (null = una qualsiasi)
    private record TascaBinder(Oggetto oggetto, Variante variante) {
    }

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
        boolean master = Boolean.TRUE.equals(body.master());
        if (master && body.espansioneId() == null) {
            throw new BadRequestException("Il master set è di un set");
        }
        List<Oggetto> carte = carteChecklist(body);
        List<TascaBinder> voci = master ? vociMaster(carte)
                : carte.stream().map(c -> new TascaBinder(c, null)).toList();
        int pagine = voci.isEmpty() ? body.pagine() : pagineChecklist(voci.size(), body.tasche(), troppe(body));
        Binder binder = new Binder(utente, body.nome().trim(), body.tasche(), pagine, body.colore().toLowerCase(), body.motivo());
        binder.setMostraMancanti(body.mostraMancanti());
        binder.setCartaCopertina(cartaCopertina(body.cartaCopertinaId()));
        // flush immediato: così createdAt è valorizzato nella risposta
        binderRepository.saveAndFlush(binder);
        riscrivi(binder, new TreeMap<>(), compatte(voci));
        return BinderResponseDTO.from(binder, voci.size());
    }

    // una tasca per ogni voce del master set, nell'ordine dell'enum: la Normale e subito dopo la Reverse holo.
    // Stesse voci del conteggio (VariantiMaster.effettive): una carta letta solo Reverse ha una tasca sola
    private List<TascaBinder> vociMaster(List<Oggetto> carte) {
        List<TascaBinder> voci = new ArrayList<>();
        for (Oggetto carta : carte) {
            VariantiMaster.effettive(carta.getVarianti())
                    .forEach(variante -> voci.add(new TascaBinder(carta, variante)));
        }
        return voci;
    }

    // carte del binder checklist (di un set, di un Pokémon o di un artista) dal set più vecchio, poi per numero;
    // vuota per un binder normale
    private List<Oggetto> carteChecklist(BinderDTO body) {
        if (Stream.of(body.espansioneId(), body.numeroPokedex(), body.artista()).filter(Objects::nonNull).count() > 1) {
            throw new BadRequestException("Un binder checklist è di un set, di un Pokémon o di un artista, non di più");
        }
        List<Oggetto> carte;
        if (body.espansioneId() != null) {
            carte = oggettoRepository.findByEspansioneId(body.espansioneId());
            if (carte.isEmpty()) throw new BadRequestException("Il set non ha ancora carte nel catalogo");
        } else if (body.numeroPokedex() != null) {
            carte = oggettoRepository.findByNumeroPokedex(body.numeroPokedex());
            if (carte.isEmpty()) throw new BadRequestException("Il Pokémon non ha ancora carte nel catalogo");
        } else if (body.artista() != null) {
            // tutte le grafie dell'artista, anche con coautori, come nella sua pagina
            ElencoArtisti.Artista artista = elencoArtisti.perSlug(body.artista())
                    .orElseThrow(() -> new NotFoundException("Artista non trovato: " + body.artista()));
            carte = oggettoRepository.findByArtistaIn(artista.grafie());
            if (carte.isEmpty()) throw new BadRequestException("L'artista non ha ancora carte nel catalogo");
        } else {
            return List.of();
        }
        return carte.stream().sorted(OrdineCarte.comparatore(CriterioOrdine.SET_NUMERO)).toList();
    }

    private static String troppe(BinderDTO body) {
        if (body.espansioneId() != null) return "Il set non ci sta: scegli più tasche";
        if (body.numeroPokedex() != null) return "Le carte di questo Pokémon non ci stanno: scegli più tasche";
        return "Le carte di questo artista non ci stanno: scegli più tasche";
    }

    private static int pagineChecklist(int carte, int tasche, String troppe) {
        int pagine = Math.max(2, (carte + tasche - 1) / tasche);
        if (pagine > PAGINE_MASSIME) {
            throw new BadRequestException(troppe);
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
            TreeMap<Integer, TascaBinder> prima = tasche(binder);
            riscrivi(binder, prima, Disposizione.inserisci(prima, totale(binder), indice(binder, body.pagina(), body.posizione()),
                    new TascaBinder(oggetto, null)));
            return new SlotBinderResponseDTO(body.pagina(), body.posizione(), OggettoResponseDTO.from(oggetto), null);
        }
        SlotBinder slot = slotRepository.findByBinderIdAndPaginaAndPosizione(id, body.pagina(), body.posizione())
                .orElseGet(() -> new SlotBinder(binder, body.pagina(), body.posizione(), oggetto));
        // la carta inserita a mano sostituisce anche la variante della tasca
        slot.setOggetto(oggetto);
        slot.setVariante(null);
        return SlotBinderResponseDTO.from(slotRepository.save(slot));
    }

    @Transactional
    public void svuota(Utente utente, UUID id, int pagina, int posizione, boolean faiSpazio) {
        Binder binder = findBinder(utente, id);
        SlotBinder slot = slotRepository.findByBinderIdAndPaginaAndPosizione(id, pagina, posizione)
                .orElseThrow(() -> new NotFoundException("La tasca " + (posizione + 1) + " di pagina " + (pagina + 1) + " è già vuota"));
        if (faiSpazio) {
            TreeMap<Integer, TascaBinder> prima = tasche(binder);
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
            TreeMap<Integer, TascaBinder> prima = tasche(binder);
            riscrivi(binder, prima, Disposizione.sposta(prima, totale(binder),
                    indice(binder, body.daPagina(), body.daPosizione()), indice(binder, body.aPagina(), body.aPosizione())));
            return;
        }
        slotRepository.findByBinderIdAndPaginaAndPosizione(id, body.aPagina(), body.aPosizione())
                .ifPresentOrElse(
                        // arrivo occupato: si scambiano le carte (con la loro variante), le righe restano dove sono.
                        // Così non si passa mai per due righe nella stessa posizione (vincolo UNIQUE)
                        arrivo -> {
                            Oggetto carta = arrivo.getOggetto();
                            Variante variante = arrivo.getVariante();
                            arrivo.setOggetto(partenza.getOggetto());
                            arrivo.setVariante(partenza.getVariante());
                            partenza.setOggetto(carta);
                            partenza.setVariante(variante);
                        },
                        () -> {
                            partenza.setPagina(body.aPagina());
                            partenza.setPosizione(body.aPosizione());
                        });
    }

    // tutte le carte, comprese le copie, tornano compatte dalla prima tasca nell'ordine del criterio, crescente o decrescente
    @Transactional
    public List<SlotBinderResponseDTO> riordina(Utente utente, UUID id, CriterioOrdine criterio, boolean decrescente) {
        Binder binder = findBinder(utente, id);
        TreeMap<Integer, TascaBinder> prima = perIndice(binder, slotRepository.findConCarteComplete(id));
        // a parità di carta prima la Normale (o nessuna variante), poi la Reverse: le coppie del master restano vicine
        Comparator<TascaBinder> ordine = Comparator.comparing(TascaBinder::oggetto, OrdineCarte.comparatore(criterio, decrescente))
                .thenComparing(t -> t.variante() == Variante.REVERSE_HOLO);
        TreeMap<Integer, TascaBinder> dopo = compatte(prima.values().stream().sorted(ordine).toList());
        riscrivi(binder, prima, dopo);
        return risposta(binder, dopo);
    }

    // sostituisce tutte le tasche con quelle ricevute: serve all'Annulla del riordino
    @Transactional
    public List<SlotBinderResponseDTO> ripristina(Utente utente, UUID id, List<DisposizioneSlotDTO> body) {
        Binder binder = findBinder(utente, id);
        // il @Valid sugli elementi di una lista nel body non è garantito: senza questo controllo un null darebbe 500
        for (DisposizioneSlotDTO s : body) {
            if (s == null || s.pagina() == null || s.posizione() == null || s.oggettoId() == null || s.pagina() < 0 || s.posizione() < 0
                    || s.variante() == Variante.PRIMA_EDIZIONE) {
                throw new BadRequestException("Ogni tasca deve avere pagina, posizione e carta valide");
            }
        }
        Map<UUID, Oggetto> trovate = oggettoRepository.findAllById(body.stream().map(DisposizioneSlotDTO::oggettoId).toList()).stream()
                .collect(Collectors.toMap(Oggetto::getId, Function.identity()));
        TreeMap<Integer, TascaBinder> dopo = new TreeMap<>();
        for (DisposizioneSlotDTO s : body) {
            controllaPosizione(binder, s.pagina(), s.posizione());
            Oggetto oggetto = trovate.get(s.oggettoId());
            if (oggetto == null) {
                throw new NotFoundException("Carta con id " + s.oggettoId() + " non trovata");
            }
            if (dopo.put(indice(binder, s.pagina(), s.posizione()), new TascaBinder(oggetto, s.variante())) != null) {
                throw new BadRequestException("Due carte nella stessa tasca");
            }
        }
        riscrivi(binder, tasche(binder), dopo);
        return risposta(binder, dopo);
    }

    @Transactional
    public BinderResponseDTO salvaImmagine(Utente utente, UUID id, byte[] contenuto) {
        Binder binder = findBinder(utente, id);
        String contentType = FormatoImmagine.controlla(contenuto);

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

    // tasche occupate come mappa indice lineare (pagina * tasche + posizione) -> contenuto
    private TreeMap<Integer, TascaBinder> tasche(Binder binder) {
        return perIndice(binder, slotRepository.findByBinderIdOrderByPaginaAscPosizioneAsc(binder.getId()));
    }

    private static TreeMap<Integer, TascaBinder> perIndice(Binder binder, List<SlotBinder> slot) {
        TreeMap<Integer, TascaBinder> tasche = new TreeMap<>();
        slot.forEach(s -> tasche.put(indice(binder, s.getPagina(), s.getPosizione()), new TascaBinder(s.getOggetto(), s.getVariante())));
        return tasche;
    }

    private static TreeMap<Integer, TascaBinder> compatte(List<TascaBinder> carte) {
        TreeMap<Integer, TascaBinder> tasche = new TreeMap<>();
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

    // riscrive solo le tasche che cambiano (carta o variante). Prima una DELETE sola (va subito al DB), poi le nuove righe, che
    // Hibernate manda a blocchi al flush: con gli INSERT prima della DELETE si violerebbe il vincolo UNIQUE
    private void riscrivi(Binder binder, SortedMap<Integer, TascaBinder> prima, SortedMap<Integer, TascaBinder> dopo) {
        Set<Integer> cambiate = new HashSet<>();
        prima.forEach((i, tasca) -> {
            TascaBinder nuova = dopo.get(i);
            if (nuova == null || !nuova.oggetto().getId().equals(tasca.oggetto().getId()) || nuova.variante() != tasca.variante()) {
                cambiate.add(i);
            }
        });
        dopo.forEach((i, tasca) -> {
            if (!prima.containsKey(i)) cambiate.add(i);
        });
        if (cambiate.isEmpty()) {
            return;
        }
        slotRepository.svuotaIndici(binder.getId(), binder.getTasche(), cambiate);
        slotRepository.saveAll(cambiate.stream()
                .filter(dopo::containsKey)
                .map(i -> new SlotBinder(binder, i / binder.getTasche(), i % binder.getTasche(), dopo.get(i).oggetto(), dopo.get(i).variante()))
                .toList());
    }

    // risposta costruita dalla disposizione appena scritta, senza rileggere le tasche
    private static List<SlotBinderResponseDTO> risposta(Binder binder, SortedMap<Integer, TascaBinder> tasche) {
        return tasche.entrySet().stream()
                .map(e -> new SlotBinderResponseDTO(e.getKey() / binder.getTasche(), e.getKey() % binder.getTasche(),
                        OggettoResponseDTO.from(e.getValue().oggetto()), e.getValue().variante()))
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

}
