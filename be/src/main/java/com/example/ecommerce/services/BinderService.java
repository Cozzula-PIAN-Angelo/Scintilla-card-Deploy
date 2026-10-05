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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
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
        return new BinderDettaglioDTO(BinderResponseDTO.from(binder, slot.size()), slot);
    }

    @Transactional
    public BinderResponseDTO crea(Utente utente, BinderDTO body) {
        controllaTasche(body.tasche());
        Binder binder = new Binder(utente, body.nome().trim(), body.tasche(), body.pagine(), body.colore().toLowerCase(), body.motivo());
        binder.setCartaCopertina(cartaCopertina(body.cartaCopertinaId()));
        // flush immediato: così createdAt è valorizzato nella risposta
        return BinderResponseDTO.from(binderRepository.saveAndFlush(binder), 0);
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

        SlotBinder slot = slotRepository.findByBinderIdAndPaginaAndPosizione(id, body.pagina(), body.posizione())
                .orElseGet(() -> new SlotBinder(binder, body.pagina(), body.posizione(), oggetto));
        slot.setOggetto(oggetto);
        return SlotBinderResponseDTO.from(slotRepository.save(slot));
    }

    @Transactional
    public void svuota(Utente utente, UUID id, int pagina, int posizione) {
        findBinder(utente, id);
        SlotBinder slot = slotRepository.findByBinderIdAndPaginaAndPosizione(id, pagina, posizione)
                .orElseThrow(() -> new NotFoundException("La tasca " + (posizione + 1) + " di pagina " + (pagina + 1) + " è già vuota"));
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
