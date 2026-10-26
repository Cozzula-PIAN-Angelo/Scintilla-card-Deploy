package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.Oggetto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface OggettoRepository extends JpaRepository<Oggetto, UUID> {

    boolean existsByNome(String nome);

    boolean existsByNomeAndIdNot(String nome, UUID id);

    boolean existsByIdEsterno(String idEsterno);

    List<Oggetto> findByEspansioneId(String espansioneId);

    // ricerca per nome nel catalogo (cassetto delle carte del binder)
    Page<Oggetto> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    Page<Oggetto> findByImmagineUrlIsNotNull(Pageable pageable);

    Page<Oggetto> findByNomeContainingIgnoreCaseAndImmagineUrlIsNotNull(String nome, Pageable pageable);

    // carte che l'utente ha in collezione (cassetto del binder): una per carta qualunque sia la variante, dall'ultima
    // aggiunta o modificata, id per un ordine stabile tra le pagine. nome: frammento con %, _ e \ già protetti
    // ('' = tutte). L'ordine sta nella query: il Pageable porta solo pagina e dimensione
    @Query(value = "SELECT o.* FROM oggetti o "
            + "JOIN (SELECT id_oggetto, MAX(aggiornata_il) AS ultima FROM collezione WHERE id_utente = :utenteId "
            + "GROUP BY id_oggetto) c ON c.id_oggetto = o.id "
            + "WHERE o.nome ILIKE '%' || :nome || '%' ESCAPE '\\' "
            + "ORDER BY c.ultima DESC, o.id",
            countQuery = "SELECT COUNT(DISTINCT c.id_oggetto) FROM collezione c JOIN oggetti o ON o.id = c.id_oggetto "
                    + "WHERE c.id_utente = :utenteId AND o.nome ILIKE '%' || :nome || '%' ESCAPE '\\'",
            nativeQuery = true)
    Page<Oggetto> possedute(@Param("utenteId") UUID utenteId, @Param("nome") String nome, Pageable pageable);

    List<Oggetto> findByIdEsternoIn(Collection<String> idEsterni);

    // carte della pagina al volo, con l'espansione già caricata: si ordinano per data d'uscita fuori dalla sessione
    @Query("SELECT o FROM Oggetto o LEFT JOIN FETCH o.espansione WHERE o.idEsterno IN :idEsterni")
    List<Oggetto> findConEspansioneByIdEsternoIn(@Param("idEsterni") Collection<String> idEsterni);

    // carte di un Pokémon, con l'espansione già caricata per ordinarle per data d'uscita
    @Query("SELECT o FROM Oggetto o LEFT JOIN FETCH o.espansione JOIN o.numeriPokedex n WHERE n = :numero")
    List<Oggetto> findByNumeroPokedex(@Param("numero") int numero);

    // tra i nomi passati, quelli già usati: una sola query per tutte le carte nuove di un import
    @Query("SELECT o.nome FROM Oggetto o WHERE o.nome IN :nomi")
    Set<String> findNomiPresenti(@Param("nomi") Collection<String> nomi);

    // tra gli idEsterno passati, quelli già importati: una sola query per un'intera pagina di risultati
    @Query("SELECT o.idEsterno FROM Oggetto o WHERE o.idEsterno IN :idEsterni")
    Set<String> findIdEsterniPresenti(@Param("idEsterni") Collection<String> idEsterni);

    // tra gli id dati, le carte del catalogo con espansione, varianti, rarità e artista già letti: lo scaricamento
    // da TCGdex non chiede di nuovo il loro dettaglio
    @Query("SELECT o.idEsterno FROM Oggetto o WHERE o.idEsterno IN :idEsterni AND o.espansione IS NOT NULL "
            + "AND o.varianti IS NOT NULL AND o.rarita IS NOT NULL AND o.artista IS NOT NULL")
    Set<String> findIdEsterniCompleti(@Param("idEsterni") Collection<String> idEsterni);

    // set già importati con almeno una carta di TCGdex di cui varianti, rarità o artista non sono mai stati letti.
    // Ordine casuale: i set che falliscono sempre (es. 404) non occupano ogni giro a danno degli altri
    @Query(value = "SELECT o.espansione_id FROM oggetti o JOIN espansioni e ON e.id = o.espansione_id "
            + "WHERE (o.varianti IS NULL OR o.rarita IS NULL OR o.artista IS NULL) AND o.id_esterno IS NOT NULL AND e.importata "
            + "GROUP BY o.espansione_id ORDER BY random() LIMIT :limite", nativeQuery = true)
    List<String> findSetConVariantiMancanti(@Param("limite") int limite);

    // carte da rileggere (varianti, rarità o artista mai letti) fuori dai set importati: arrivate dalle pagine di
    // Pokémon e artisti, il riempimento per set non le vede. Ordine casuale come per i set: le carte sempre in errore
    // non occupano ogni giro
    @Query(value = "SELECT o.id_esterno FROM oggetti o LEFT JOIN espansioni e ON e.id = o.espansione_id "
            + "WHERE o.id_esterno IS NOT NULL AND (e.id IS NULL OR NOT e.importata) "
            + "AND (o.varianti IS NULL OR o.rarita IS NULL OR o.artista IS NULL) ORDER BY random() LIMIT :limite",
            nativeQuery = true)
    List<String> findIdEsterniDaRiempireFuoriDaiSetImportati(@Param("limite") int limite);

    // carte da rinfrescare nel job: in almeno un binder, con prezzi mai letti o letti prima di `prima`. Prima le mai
    // lette, poi le più vecchie; gli oggetti creati a mano (senza id di TCGdex) mai
    @Query(value = "SELECT o.id_esterno FROM oggetti o WHERE o.id_esterno IS NOT NULL "
            + "AND EXISTS (SELECT 1 FROM binder_slot s WHERE s.id_oggetto = o.id) "
            + "AND (o.prezzi_aggiornati_il IS NULL OR o.prezzi_aggiornati_il < :prima) "
            + "ORDER BY o.prezzi_aggiornati_il NULLS FIRST, o.id LIMIT :limite",
            nativeQuery = true)
    List<String> findIdEsterniConPrezziDaRinfrescare(@Param("limite") int limite, @Param("prima") Instant prima);

    // carte di TCGdex con i prezzi mai letti (anche fuori dai binder); gli oggetti creati a mano mai
    @Query(value = "SELECT o.id_esterno FROM oggetti o WHERE o.id_esterno IS NOT NULL AND o.prezzi_aggiornati_il IS NULL "
            + "ORDER BY o.id LIMIT :limite", nativeQuery = true)
    List<String> findIdEsterniSenzaPrezzi(@Param("limite") int limite);

    // le carte di un set ancora senza varianti, rarità o artista: dopo il riempimento sono quelle che TCGdex non restituisce più
    @Query("SELECT o FROM Oggetto o WHERE o.espansione.id = :espansioneId AND o.idEsterno IS NOT NULL "
            + "AND (o.varianti IS NULL OR o.rarita IS NULL OR o.artista IS NULL)")
    List<Oggetto> findCarteDaRiempireDelSet(@Param("espansioneId") String espansioneId);

    // carte di un artista: tutte le grafie grezze in cui compare (da solo o con coautori), espansione in join
    @Query("SELECT o FROM Oggetto o LEFT JOIN FETCH o.espansione WHERE o.artista IN :grafie")
    List<Oggetto> findByArtistaIn(@Param("grafie") Collection<String> grafie);

    // tutte le carte con artista e immagine, per il muro degli illustratori: una riga leggera per carta
    @Query("SELECT o.artista AS artista, o.id AS id, o.nome AS nome, o.numero AS numero, o.rarita AS rarita, "
            + "o.immagineUrl AS immagineUrl, o.prezzoMassimo AS prezzoMassimo, SIZE(o.numeriPokedex) AS numeriPokedex "
            + "FROM Oggetto o WHERE o.artista IS NOT NULL AND o.artista <> '' AND o.immagineUrl IS NOT NULL")
    List<CartaDiArtista> findCarteConArtista();

    // carte per cui TCGdex non indica un artista (pagina "Illustratore sconosciuto")
    @Query("SELECT o FROM Oggetto o LEFT JOIN FETCH o.espansione WHERE o.artista = ''")
    List<Oggetto> findSenzaArtista();

    // dopo un download completo delle carte senza artista: quelle che TCGdex non restituisce più tra le
    // senza artista ne hanno ricevuto uno, e tornano "da leggere" (null) per il job o per la pagina dell'artista
    @Modifying
    @Query("UPDATE Oggetto o SET o.artista = NULL WHERE o.artista = '' AND o.idEsterno IS NOT NULL "
            + "AND o.idEsterno NOT IN :idEsterniAncoraSenza")
    int liberaSenzaArtista(@Param("idEsterniAncoraSenza") Collection<String> idEsterniAncoraSenza);
}
