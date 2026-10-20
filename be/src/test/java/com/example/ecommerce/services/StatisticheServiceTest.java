package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.payloads.ProfiloDTO;
import com.example.ecommerce.payloads.StatisticheDTO;
import com.example.ecommerce.payloads.StatisticheDTO.AvanzamentoSetDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// statistiche calcolate con SQL su un PostgreSQL vero
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class StatisticheServiceTest {

    @Autowired
    private DataSource dataSource;
    @Autowired
    private OggettoRepository oggettoRepository;

    private JdbcTemplate jdbc;
    private StatisticheService service;
    private final UUID idUtente = UUID.randomUUID();
    private final UUID idAltro = UUID.randomUUID();
    private Utente utente;
    private Utente altro;

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        service = new StatisticheService(jdbc, oggettoRepository);
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'mario', 'mario@esempio.it', 'hash')", idUtente);
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'luigi', 'luigi@esempio.it', 'hash')", idAltro);
        utente = new Utente();
        ReflectionTestUtils.setField(utente, "id", idUtente);
        altro = new Utente();
        ReflectionTestUtils.setField(altro, "id", idAltro);
        set("base1", "Base", "Base", "1999-01-09", true, 102);
    }

    @Test
    void collezioneVuota() {
        StatisticheDTO s = service.statistiche(utente);

        assertThat(s.totali().carteDiverse()).isZero();
        assertThat(s.totali().copie()).isZero();
        assertThat(s.totali().copiePerVariante()).isEmpty();
        assertThat(s.totali().setIniziati()).isZero();
        assertThat(s.valore().totale()).isEqualByComparingTo("0");
        assertThat(s.valore().piuPreziose()).isEmpty();
        assertThat(s.set()).isEmpty();
        assertThat(s.pokemon()).isEmpty();
    }

    @Test
    void totaliECopiePerVariante() {
        UUID a = carta("Abra", "base1", "1.00");
        UUID b = carta("Zubat", "base1", "1.00");
        possiedi(utente, a, Variante.NORMALE, 2);
        possiedi(utente, a, Variante.REVERSE_HOLO, 1);
        possiedi(utente, b, Variante.NORMALE, 1);

        StatisticheDTO.Totali t = service.statistiche(utente).totali();

        assertThat(t.carteDiverse()).isEqualTo(2);
        assertThat(t.copie()).isEqualTo(4);
        assertThat(t.copiePerVariante()).isEqualTo(Map.of(Variante.NORMALE, 3L, Variante.REVERSE_HOLO, 1L));
    }

    @Test
    void valoreEPiuPreziose() {
        UUID cara = carta("Charizard", "base1", "10.00");
        UUID abra = carta("Abra", "base1", "5.00");
        UUID zubat = carta("Zubat", "base1", "5.00");
        possiedi(utente, cara, Variante.NORMALE, 2);
        possiedi(utente, zubat, Variante.NORMALE, 1);
        possiedi(utente, abra, Variante.NORMALE, 1);
        for (int i = 0; i < 9; i++) {
            possiedi(utente, carta("Comune " + i, "base1", "0.10"), Variante.NORMALE, 1);
        }

        StatisticheDTO.Valore v = service.statistiche(utente).valore();

        assertThat(v.totale()).isEqualByComparingTo("30.90");
        assertThat(v.piuPreziose()).hasSize(10);
        assertThat(v.piuPreziose()).extracting(c -> c.oggetto().nome()).startsWith("Charizard", "Abra", "Zubat");
        assertThat(v.piuPreziose().getFirst().copie()).isEqualTo(2);
        assertThat(v.piuPreziose().getFirst().valore()).isEqualByComparingTo("20.00");
        assertThat(v.piuPreziose().getFirst().nomeSet()).isEqualTo("Base");
    }

    @Test
    void setImportatoCompletato() {
        set("base2", "Jungle", "Base", "1999-06-16", true, 64);
        UUID a = carta("Pinsir", "base2", "1.00");
        UUID b = carta("Scyther", "base2", "1.00");
        possiedi(utente, a, Variante.NORMALE, 1);
        possiedi(utente, b, Variante.REVERSE_HOLO, 3);
        possiedi(utente, carta("Abra", "base1", "1.00"), Variante.NORMALE, 1);
        carta("Zubat", "base1", "1.00");

        StatisticheDTO s = service.statistiche(utente);

        // importato: il totale sono le carte del catalogo, non totale_carte
        assertThat(set(s, "base2")).extracting(AvanzamentoSetDTO::possedute, AvanzamentoSetDTO::totale).containsExactly(2, 2);
        assertThat(set(s, "base1")).extracting(AvanzamentoSetDTO::possedute, AvanzamentoSetDTO::totale).containsExactly(1, 2);
        assertThat(s.totali().setIniziati()).isEqualTo(2);
        assertThat(s.totali().setCompletati()).isEqualTo(1);
    }

    @Test
    void totaleSetNonImportato() {
        set("x1", "Cento", null, "2020-01-01", false, 100);
        set("x2", "Pochi", null, "2020-01-02", false, 2);
        set("x3", "Senza", null, "2020-01-03", false, null);
        for (String id : new String[]{"x1", "x2", "x3"}) {
            possiedi(utente, carta(id + " a", id, "1.00"), Variante.NORMALE, 1);
            carta(id + " b", id, "1.00");
            carta(id + " c", id, "1.00");
        }

        StatisticheDTO s = service.statistiche(utente);

        assertThat(set(s, "x1").totale()).isEqualTo(100);
        assertThat(set(s, "x2").totale()).isEqualTo(3);
        assertThat(set(s, "x3").totale()).isEqualTo(3);
    }

    @Test
    void setOrdinatiDalPiuRecente() {
        set("sv1", "Scarlatto", "Scarlatto e Violetto", "2023-03-31", true, 258);
        possiedi(utente, carta("Abra", "base1", "1.00"), Variante.NORMALE, 1);
        possiedi(utente, carta("Sprigatito", "sv1", "1.00"), Variante.NORMALE, 1);

        assertThat(service.statistiche(utente).set()).extracting(AvanzamentoSetDTO::id).containsExactly("sv1", "base1");
    }

    @Test
    void cartaSenzaSetNeiTotaliNonNeiSet() {
        possiedi(utente, carta("Oggetto a mano", null, "3.00"), Variante.NORMALE, 1);

        StatisticheDTO s = service.statistiche(utente);

        assertThat(s.totali().carteDiverse()).isEqualTo(1);
        assertThat(s.valore().totale()).isEqualByComparingTo("3.00");
        assertThat(s.set()).isEmpty();
    }

    @Test
    void pokemonSenzaDoppioni() {
        UUID coppia = carta("Pikachu & Zekrom", "base1", "1.00");
        UUID pikachu = carta("Pikachu", "base1", "1.00");
        pokedex(coppia, 25);
        pokedex(coppia, 644);
        pokedex(pikachu, 25);
        possiedi(utente, coppia, Variante.NORMALE, 1);
        possiedi(utente, pikachu, Variante.NORMALE, 1);
        possiedi(utente, pikachu, Variante.REVERSE_HOLO, 1);

        assertThat(service.statistiche(utente).pokemon()).containsExactly(25, 644);
    }

    @Test
    void binderETasche() {
        UUID abra = carta("Abra", "base1", "1.00");
        UUID primo = binder(utente);
        UUID secondo = binder(utente);
        tasca(primo, 0, abra);
        tasca(primo, 1, abra);
        tasca(secondo, 0, abra);

        StatisticheDTO.Totali t = service.statistiche(utente).totali();

        assertThat(t.binder()).isEqualTo(2);
        assertThat(t.carteNeiBinder()).isEqualTo(3);
    }

    // i 4 numeri del profilo: base1 ha solo queste due carte nel catalogo, quindi è completo
    @Test
    void riepilogoContaCarteSetPokemonEBinder() {
        UUID abra = carta("Abra", "base1", "1.00");
        UUID zubat = carta("Zubat", "base1", "1.00");
        pokedex(abra, 63);
        pokedex(zubat, 41);
        possiedi(utente, abra, Variante.NORMALE, 2);
        possiedi(utente, zubat, Variante.REVERSE_HOLO, 1);
        binder(utente);
        tasca(binder(altro), 0, abra);

        assertThat(service.riepilogo(idUtente)).isEqualTo(new ProfiloDTO.RiepilogoDTO(2, 1, 2, 1));
    }

    @Test
    void soloDatiDellUtente() {
        UUID abra = carta("Abra", "base1", "4.00");
        possiedi(altro, abra, Variante.NORMALE, 5);
        pokedex(abra, 63);
        tasca(binder(altro), 0, abra);

        StatisticheDTO s = service.statistiche(utente);

        assertThat(s.totali().carteDiverse()).isZero();
        assertThat(s.totali().binder()).isZero();
        assertThat(s.totali().carteNeiBinder()).isZero();
        assertThat(s.valore().totale()).isEqualByComparingTo("0");
        assertThat(s.set()).isEmpty();
        assertThat(s.pokemon()).isEmpty();
    }

    @Test
    void masterDiUnSetImportato() {
        set("sv8", "Surging Sparks", "Scarlet & Violet", "2024-11-08", true, 252);
        UUID comune = carta("Pikachu", "sv8", "Common", "NORMALE,REVERSE_HOLO");
        carta("Raichu", "sv8", "Rare", "NORMALE");
        UUID doppia = carta("Pikachu ex", "sv8", "Double Rare", "NORMALE");
        possiedi(utente, comune, Variante.NORMALE, 1);
        possiedi(utente, comune, Variante.REVERSE_HOLO, 1);
        // reverse di una carta che non ce l'ha: non conta
        possiedi(utente, doppia, Variante.REVERSE_HOLO, 1);

        assertThat(set(service.statistiche(utente), "sv8"))
                .extracting(AvanzamentoSetDTO::posseduteMaster, AvanzamentoSetDTO::totaleMaster).containsExactly(2, 4);
    }

    // varianti non ancora lette da TCGdex: ogni carta vale la sola Normale, la rarità non conta più
    @Test
    void masterDiUnSetSenzaVariantiLette() {
        set("me3", "Perfect Order", "Mega Evolution", "2026-03-27", true, 124);
        UUID comune = carta("Abra", "me3", "Common", "");
        carta("Mega Alakazam ex", "me3", "Double Rare", "");
        possiedi(utente, comune, Variante.NORMALE, 1);
        possiedi(utente, comune, Variante.REVERSE_HOLO, 1);

        assertThat(set(service.statistiche(utente), "me3"))
                .extracting(AvanzamentoSetDTO::posseduteMaster, AvanzamentoSetDTO::totaleMaster).containsExactly(1, 2);
    }

    @Test
    void masterNullPerSetNonImportato() {
        set("sv9", "Journey Together", "Scarlet & Violet", "2025-03-28", false, 190);
        possiedi(utente, carta("Abra", "sv9", "Common", "NORMALE,REVERSE_HOLO"), Variante.NORMALE, 1);

        AvanzamentoSetDTO sv9 = set(service.statistiche(utente), "sv9");
        assertThat(sv9.posseduteMaster()).isNull();
        assertThat(sv9.totaleMaster()).isNull();
    }

    private static AvanzamentoSetDTO set(StatisticheDTO s, String id) {
        return s.set().stream().filter(x -> x.id().equals(id)).findFirst().orElseThrow();
    }

    private void set(String id, String nome, String serie, String uscita, boolean importata, Integer totale) {
        jdbc.update("INSERT INTO espansioni (id, nome, serie, data_uscita, importata, totale_carte) VALUES (?, ?, ?, ?::date, ?, ?)",
                id, nome, serie, uscita, importata, totale);
    }

    private UUID carta(String nome, String set, String prezzo) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id) VALUES (?, ?, ?, now(), ?)",
                id, nome, new BigDecimal(prezzo), set);
        return id;
    }

    private UUID carta(String nome, String set, String rarita, String varianti) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id, rarita, varianti) VALUES (?, ?, 1, now(), ?, ?, ?)",
                id, nome, set, rarita, varianti);
        return id;
    }

    private void pokedex(UUID carta, int numero) {
        jdbc.update("INSERT INTO oggetti_pokedex (oggetto_id, numero_pokedex) VALUES (?, ?)", carta, numero);
    }

    private void possiedi(Utente chi, UUID carta, Variante variante, int quantita) {
        jdbc.update("INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il) VALUES (?, ?, ?, ?, ?, now())",
                UUID.randomUUID(), chi.getId(), carta, variante.name(), quantita);
    }

    private UUID binder(Utente chi) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO binder (id, id_utente, nome, tasche, pagine, colore, motivo, created_at) VALUES (?, ?, 'Prova', 9, 2, '#336699', 'STELLE', now())",
                id, chi.getId());
        return id;
    }

    private void tasca(UUID binder, int posizione, UUID carta) {
        jdbc.update("INSERT INTO binder_slot (id, id_binder, pagina, posizione, id_oggetto) VALUES (?, ?, 0, ?, ?)",
                UUID.randomUUID(), binder, posizione, carta);
    }
}
