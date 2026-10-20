package com.example.ecommerce.services;

import com.example.ecommerce.entities.AvatarProfilo;
import com.example.ecommerce.entities.Binder;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Profilo;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.BinderResponseDTO;
import com.example.ecommerce.payloads.ModificaProfiloDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.ProfiloDTO;
import com.example.ecommerce.repositories.AvatarProfiloRepository;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.ProfiloRepository;
import com.example.ecommerce.repositories.SlotBinderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// profilo dell'utente: bio, colore, squadra (il primo è il compagno), vetrina e binder in evidenza.
// Le liste arrivano sempre intere e ordinate e sostituiscono quelle salvate
@Service
@RequiredArgsConstructor
public class ProfiloService {

    public static final int MASSIMO_VETRINA = 6;
    public static final int MASSIMO_BINDER = 3;
    public static final int MASSIMO_SQUADRA = 6;
    // Pokédex nazionale, come nel frontend (pokedex.json)
    private static final int ULTIMO_POKEMON = 1025;

    private final ProfiloRepository profiloRepository;
    private final OggettoRepository oggettoRepository;
    private final BinderRepository binderRepository;
    private final SlotBinderRepository slotRepository;
    private final StatisticheService statisticheService;
    private final AvatarProfiloRepository avatarRepository;

    @Transactional(readOnly = true)
    public ProfiloDTO getProfilo(Utente utente) {
        // mai salvato: un profilo vuoto, senza creare la riga
        Profilo profilo = profiloRepository.findById(utente.getId()).orElseGet(() -> new Profilo(utente));
        return comeDTO(utente, profilo);
    }

    @Transactional
    public ProfiloDTO modifica(Utente utente, ModificaProfiloDTO body) {
        Profilo profilo = profiloDi(utente);
        String bio = body.bio() == null ? null : body.bio().trim();
        profilo.setBio(bio == null || bio.isEmpty() ? null : bio);
        profilo.setColore(body.colore());
        return comeDTO(utente, profiloRepository.save(profilo));
    }

    @Transactional
    public ProfiloDTO salvaVetrina(Utente utente, List<UUID> ids) {
        controllaLista(ids, MASSIMO_VETRINA, "La vetrina può avere al massimo " + MASSIMO_VETRINA + " carte",
                "Una carta è in vetrina più di una volta");
        // findAllById non garantisce l'ordine: si rimette quello ricevuto
        Map<UUID, Oggetto> trovate = oggettoRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Oggetto::getId, Function.identity()));
        List<Oggetto> vetrina = new ArrayList<>();
        for (UUID id : ids) {
            Oggetto carta = trovate.get(id);
            if (carta == null) throw new NotFoundException("Carta con id " + id + " non trovata");
            vetrina.add(carta);
        }
        Profilo profilo = profiloDi(utente);
        // lista nuova, mai modificata sul posto: vedi Profilo
        profilo.setVetrina(vetrina);
        return comeDTO(utente, profiloRepository.save(profilo));
    }

    @Transactional
    public ProfiloDTO salvaBinder(Utente utente, List<UUID> ids) {
        controllaLista(ids, MASSIMO_BINDER, "Puoi mettere in evidenza al massimo " + MASSIMO_BINDER + " binder",
                "Un binder è in evidenza più di una volta");
        // solo i propri binder: quelli degli altri risultano inesistenti, come in BinderService
        List<Binder> binder = new ArrayList<>();
        for (UUID id : ids) {
            binder.add(binderRepository.findByIdAndUtenteId(id, utente.getId())
                    .orElseThrow(() -> new NotFoundException("Binder con id " + id + " non trovato")));
        }
        Profilo profilo = profiloDi(utente);
        profilo.setBinder(binder);
        return comeDTO(utente, profiloRepository.save(profilo));
    }

    @Transactional
    public ProfiloDTO salvaSquadra(Utente utente, List<Integer> numeri) {
        controllaLista(numeri, MASSIMO_SQUADRA, "La squadra può avere al massimo " + MASSIMO_SQUADRA + " Pokémon",
                "Un Pokémon è in squadra più di una volta");
        for (Integer numero : numeri) {
            if (numero < 1 || numero > ULTIMO_POKEMON) {
                throw new BadRequestException("Il numero di Pokédex deve essere tra 1 e " + ULTIMO_POKEMON);
            }
        }
        Profilo profilo = profiloDi(utente);
        profilo.setSquadra(new ArrayList<>(numeri));
        return comeDTO(utente, profiloRepository.save(profilo));
    }

    // immagine già ritagliata e compressa dal browser; la data fa da versione nell'URL
    @Transactional
    public ProfiloDTO salvaAvatar(Utente utente, byte[] contenuto) {
        String contentType = FormatoImmagine.controlla(contenuto);
        AvatarProfilo avatar = avatarRepository.findById(utente.getId())
                .orElseGet(() -> new AvatarProfilo(utente, contenuto, contentType));
        avatar.setContenuto(contenuto);
        avatar.setContentType(contentType);
        avatarRepository.save(avatar);
        Profilo profilo = profiloDi(utente);
        profilo.setAvatarAggiornatoIl(Instant.now());
        return comeDTO(utente, profiloRepository.save(profilo));
    }

    @Transactional
    public ProfiloDTO rimuoviAvatar(Utente utente) {
        if (avatarRepository.existsById(utente.getId())) avatarRepository.deleteById(utente.getId());
        Profilo profilo = profiloDi(utente);
        profilo.setAvatarAggiornatoIl(null);
        return comeDTO(utente, profiloRepository.save(profilo));
    }

    // pubblica (GET /avatar/{id}): un account cancellato non ha più un'immagine
    @Transactional(readOnly = true)
    public AvatarProfilo getAvatar(UUID idUtente) {
        return avatarRepository.findById(idUtente)
                .filter(avatar -> !avatar.getUtente().isAnonimizzato())
                .orElseThrow(() -> new NotFoundException("Questo utente non ha un'immagine profilo"));
    }

    // il profilo salvato, o uno nuovo da salvare per la prima volta
    private Profilo profiloDi(Utente utente) {
        return profiloRepository.findById(utente.getId()).orElseGet(() -> new Profilo(utente));
    }

    private static void controllaLista(List<?> lista, int massimo, String troppi, String doppioni) {
        // non contains(null): le liste immutabili lanciano NullPointerException
        if (lista.stream().anyMatch(Objects::isNull)) throw new BadRequestException("La lista contiene un valore vuoto");
        if (lista.size() > massimo) throw new BadRequestException(troppi);
        if (new HashSet<>(lista).size() != lista.size()) throw new BadRequestException(doppioni);
    }

    private ProfiloDTO comeDTO(Utente utente, Profilo profilo) {
        UUID id = utente.getId();
        List<BinderResponseDTO> binder = List.of();
        // i null sono carte o binder cancellati (vedi Profilo)
        List<Binder> inEvidenza = profilo.getBinder().stream().filter(Objects::nonNull).toList();
        if (!inEvidenza.isEmpty()) {
            Map<UUID, Long> carte = slotRepository.contaCartePerBinder(id).stream()
                    .collect(Collectors.toMap(riga -> (UUID) riga[0], riga -> (Long) riga[1]));
            binder = inEvidenza.stream()
                    .map(b -> BinderResponseDTO.from(b, carte.getOrDefault(b.getId(), 0L)))
                    .toList();
        }
        return new ProfiloDTO(
                id,
                utente.getUsername(),
                utente.getCreatedAt(),
                profilo.getAvatarAggiornatoIl(),
                profilo.getBio(),
                profilo.getColore(),
                List.copyOf(profilo.getSquadra()),
                profilo.getVetrina().stream().filter(Objects::nonNull).map(OggettoResponseDTO::from).toList(),
                binder,
                statisticheService.riepilogo(id));
    }
}
