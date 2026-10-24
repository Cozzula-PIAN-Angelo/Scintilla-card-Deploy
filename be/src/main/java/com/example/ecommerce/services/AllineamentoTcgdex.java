package com.example.ecommerce.services;

import com.example.ecommerce.payloads.TcgdexApi.CartaDelCatalogo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// Il catalogo allineato a TCGdex, con una chiamata sola per tutte le carte. Gira all'avvio e ogni notte dopo i set,
// da cui prende nome e carte ufficiali; le carte che TCGdex non ha restano come sono.
// - Nome e numero come all'import (CatalogoService.componiNome): le carte convertite da pokemontcg.io avevano tenuto
//   quelli della vecchia API ("Base" invece di "Base Set", "-GX" invece di " GX", in 30th Classic Collection il numero
//   della carta originale); nei set promo il totale fra parentesi cresce quando TCGdex aggiunge carte. Un nome
//   cambiato a mano dall'admin torna quello di TCGdex.
// - Immagine e rarità arrivate dopo: un set scaricato il giorno dell'uscita resta senza immagini finché TCGdex non le
//   pubblica, e l'import non rilegge le carte. Si riempie solo quello che manca (immagine null, rarità letta e vuota);
//   una rarità mai letta (null) la riempie RiempimentoVarianti, che conosce le varianti
@Slf4j
@Service
public class AllineamentoTcgdex {

    private final TcgdexClient tcgdex;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transazione;

    public AllineamentoTcgdex(TcgdexClient tcgdex, JdbcTemplate jdbc, TransactionTemplate transazione) {
        this.tcgdex = tcgdex;
        this.jdbc = jdbc;
        this.transazione = transazione;
    }

    private record SetSalvato(String nome, Integer ufficiali) {
    }

    private record Riga(UUID id, String idEsterno, String nome, String numero, String immagine, String rarita) {
    }

    // nome, immagine e rarità null: restano quelli di adesso
    private record Cambio(UUID id, String idEsterno, String nome, String numero, String immagine, String rarita) {
    }

    // restituisce quante carte ha cambiato. La chiamata a TCGdex sta fuori dalla transazione
    public int allinea() {
        List<CartaDelCatalogo> carte = tcgdex.carteDelCatalogo();
        Integer cambiate = transazione.execute(stato -> allinea(carte));
        return cambiate == null ? 0 : cambiate;
    }

    int allinea(List<CartaDelCatalogo> carte) {
        Map<String, CartaDelCatalogo> perId = carte.stream()
                .collect(Collectors.toMap(CartaDelCatalogo::id, Function.identity(), (prima, seconda) -> prima));
        Map<String, SetSalvato> set = new HashMap<>();
        jdbc.query("SELECT id, nome, carte_ufficiali FROM espansioni", riga -> {
            set.put(riga.getString("id"), new SetSalvato(riga.getString("nome"), (Integer) riga.getObject("carte_ufficiali")));
        });
        List<Riga> righe = jdbc.query("SELECT id, id_esterno, nome, numero, immagine_url, rarita FROM oggetti",
                (riga, n) -> new Riga(riga.getObject("id", UUID.class), riga.getString("id_esterno"), riga.getString("nome"),
                        riga.getString("numero"), riga.getString("immagine_url"), riga.getString("rarita")));

        // prima i nomi che restano, poi quelli nuovi: un nome nuovo già preso prende l'id fra quadre, come all'import
        Set<String> occupati = new HashSet<>();
        List<Cambio> cambi = new ArrayList<>();
        List<Cambio> daRinominare = new ArrayList<>();
        for (Riga riga : righe) {
            CartaDelCatalogo carta = riga.idEsterno() == null ? null : perId.get(riga.idEsterno());
            SetSalvato espansione = carta == null || carta.set() == null ? null : set.get(carta.set().id());
            if (espansione == null) {
                occupati.add(riga.nome());
                continue;
            }
            String nome = CatalogoService.componiNome(carta.name(), espansione.nome(), carta.localId(), espansione.ufficiali());
            String numero = CatalogoService.numeroDaLocalId(carta.localId());
            String immagine = riga.immagine() == null && pieno(carta.image()) ? carta.image() + "/high.webp" : null;
            // "None": TCGdex lo scrive per le promo, per noi è nessuna rarità come all'import
            String rarita = "".equals(riga.rarita()) && pieno(carta.rarity()) && !"None".equals(carta.rarity())
                    ? carta.rarity() : null;
            if (senzaId(riga).equals(nome)) {
                occupati.add(riga.nome());
                if (!Objects.equals(riga.numero(), numero) || immagine != null || rarita != null) {
                    cambi.add(new Cambio(riga.id(), riga.idEsterno(), null, numero, immagine, rarita));
                }
            } else {
                daRinominare.add(new Cambio(riga.id(), riga.idEsterno(), nome, numero, immagine, rarita));
            }
        }
        daRinominare.sort(Comparator.comparing(Cambio::idEsterno));
        for (Cambio cambio : daRinominare) {
            String nome = occupati.add(cambio.nome()) ? cambio.nome() : cambio.nome() + " [" + cambio.idEsterno() + "]";
            occupati.add(nome);
            cambi.add(new Cambio(cambio.id(), cambio.idEsterno(), nome, cambio.numero(), cambio.immagine(), cambio.rarita()));
        }

        // due passaggi: un nome provvisorio unico libera i vecchi, così due carte possono scambiarsi il nome
        List<Cambio> rinominate = cambi.stream().filter(cambio -> cambio.nome() != null).toList();
        jdbc.batchUpdate("UPDATE oggetti SET nome = ? WHERE id = ?",
                rinominate.stream().map(cambio -> new Object[]{"~" + cambio.id(), cambio.id()}).toList());
        jdbc.batchUpdate("UPDATE oggetti SET nome = COALESCE(CAST(? AS varchar), nome), numero = ?, "
                        + "immagine_url = COALESCE(CAST(? AS varchar), immagine_url), rarita = COALESCE(CAST(? AS varchar), rarita) "
                        + "WHERE id = ?",
                cambi.stream().map(cambio -> new Object[]{cambio.nome(), cambio.numero(), cambio.immagine(), cambio.rarita(),
                        cambio.id()}).toList());
        if (!cambi.isEmpty()) {
            log.info("Carte allineate a TCGdex: {} ({} rinominate, {} immagini e {} rarità arrivate)", cambi.size(),
                    rinominate.size(), cambi.stream().filter(cambio -> cambio.immagine() != null).count(),
                    cambi.stream().filter(cambio -> cambio.rarita() != null).count());
        }
        return cambi.size();
    }

    private static boolean pieno(String testo) {
        return testo != null && !testo.isBlank();
    }

    // il nome senza l'id fra quadre aggiunto all'import quando era già preso
    private static String senzaId(Riga riga) {
        String suffisso = " [" + riga.idEsterno() + "]";
        return riga.nome().endsWith(suffisso) ? riga.nome().substring(0, riga.nome().length() - suffisso.length()) : riga.nome();
    }
}
