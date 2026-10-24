package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.payloads.AnteprimaSetDTO;
import com.example.ecommerce.payloads.CartaAnteprimaDTO;
import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.payloads.RaritaContataDTO;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;

// vetrina della home: i set più recenti già scaricati (solo di quelli le carte sono in archivio, gli altri si
// scaricherebbero da TCGdex), con le carte di punta e le rarità importanti. I primi tre set fisici girano nella hero;
// i set digitali (TCG Pocket) hanno una riga a parte sotto gli altri
@Service
@RequiredArgsConstructor
public class VetrinaService {

    // i set che girano nella hero, più due righe da quattro
    static final int SET_IN_HERO = 3;
    static final int SET_IN_VETRINA = SET_IN_HERO + 8;
    // la riga dei set digitali
    static final int SET_DIGITALI_IN_VETRINA = 4;
    // carte sul tavolo della hero (7) e dietro al logo degli altri set (3), più 4 di riserva per le immagini mancanti
    static final int CARTE_HERO = 11;
    static final int CARTE_ALTRI_SET = 7;
    static final int CARTE_SFONDO = 13;
    // dalle ultra rare in su
    static final int GRADO_AMBITO = 4;
    static final int RARITA_MOSTRATE = 4;

    private final EspansioneRepository espansioneRepository;
    private final OggettoRepository oggettoRepository;

    // digitali: solo i set digitali, senza hero; altrimenti solo quelli fisici
    public List<AnteprimaSetDTO> anteprime(boolean digitali) {
        List<Espansione> recenti = espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc().stream()
                .filter(e -> e.isDigitale() == digitali)
                .filter(e -> e.isImportata() && e.getLogoUrl() != null && e.getDataUscita() != null)
                .limit(digitali ? SET_DIGITALI_IN_VETRINA : SET_IN_VETRINA)
                .toList();
        return IntStream.range(0, recenti.size())
                .mapToObj(i -> anteprima(recenti.get(i), i < SET_IN_HERO && !digitali))
                .toList();
    }

    private AnteprimaSetDTO anteprima(Espansione espansione, boolean hero) {
        List<Oggetto> carte = oggettoRepository.findByEspansioneId(espansione.getId()).stream()
                .filter(c -> c.getImmagineUrl() != null)
                .toList();
        List<Oggetto> diPunta = carteDiPunta(carte, hero ? CARTE_HERO : CARTE_ALTRI_SET);
        return new AnteprimaSetDTO(
                EspansioneResponseDTO.from(espansione),
                diPunta.stream().map(CartaAnteprimaDTO::from).toList(),
                hero ? carteSfondo(carte, diPunta).stream().map(CartaAnteprimaDTO::from).toList() : List.of(),
                raritaAmbite(carte));
    }

    // per prezzo massimo di Cardmarket se il set ne ha abbastanza, altrimenti per rarità; un Pokémon una volta sola
    // (i tre Mew RGB di 30th Celebration diventano uno)
    static List<Oggetto> carteDiPunta(List<Oggetto> carte, int quante) {
        boolean perPrezzo = carte.stream().filter(c -> c.getPrezzoMassimo() != null).count() >= quante;
        Comparator<Oggetto> perRarita = Comparator.comparingInt((Oggetto c) -> GradoRarita.di(c.getRarita())).reversed();
        Comparator<Oggetto> ordine = perPrezzo
                ? Comparator.comparing(Oggetto::getPrezzoMassimo, Comparator.nullsLast(Comparator.<BigDecimal>reverseOrder()))
                        .thenComparing(perRarita)
                : perRarita;
        Set<String> nomi = new HashSet<>();
        return carte.stream()
                .sorted(ordine)
                .filter(c -> nomi.add(CartaAnteprimaDTO.nomeSenzaDettaglio(c.getNome())))
                .limit(quante)
                .toList();
    }

    // altre carte del set, prima le più rare, senza quelle già sul tavolo (stessi oggetti della stessa lista)
    static List<Oggetto> carteSfondo(List<Oggetto> carte, List<Oggetto> giaUsate) {
        Set<Oggetto> usate = Collections.newSetFromMap(new IdentityHashMap<>());
        usate.addAll(giaUsate);
        return carte.stream()
                .filter(c -> !usate.contains(c))
                .sorted(Comparator.comparingInt((Oggetto c) -> GradoRarita.di(c.getRarita())).reversed())
                .limit(CARTE_SFONDO)
                .toList();
    }

    // dalla più rara: grado più alto, poi meno copie
    static List<RaritaContataDTO> raritaAmbite(List<Oggetto> carte) {
        Map<String, Integer> conteggi = new LinkedHashMap<>();
        carte.stream()
                .filter(c -> GradoRarita.di(c.getRarita()) >= GRADO_AMBITO)
                .forEach(c -> conteggi.merge(c.getRarita(), 1, Integer::sum));
        return conteggi.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, Integer> r) -> GradoRarita.di(r.getKey())).reversed()
                        .thenComparing(Map.Entry::getValue))
                .limit(RARITA_MOSTRATE)
                .map(r -> new RaritaContataDTO(r.getKey(), r.getValue(), GradoRarita.di(r.getKey())))
                .toList();
    }
}
