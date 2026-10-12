package com.example.ecommerce.repositories;

import com.example.ecommerce.entities.CartaInCollezione;
import com.example.ecommerce.payloads.CopiaDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CollezioneRepository extends JpaRepository<CartaInCollezione, UUID> {

    // copie dell'utente nelle carte di un set
    @Query("SELECT new com.example.ecommerce.payloads.CopiaDTO(c.oggetto.id, c.variante, c.quantita) "
            + "FROM CartaInCollezione c WHERE c.utente.id = :utenteId AND c.oggetto.espansione.id = :espansioneId")
    List<CopiaDTO> copieDelSet(@Param("utenteId") UUID utenteId, @Param("espansioneId") String espansioneId);

    // copie dell'utente nelle carte che raffigurano un Pokémon (numero di Pokédex)
    @Query("SELECT new com.example.ecommerce.payloads.CopiaDTO(c.oggetto.id, c.variante, c.quantita) "
            + "FROM CartaInCollezione c WHERE c.utente.id = :utenteId AND :numero MEMBER OF c.oggetto.numeriPokedex")
    List<CopiaDTO> copieDelPokemon(@Param("utenteId") UUID utenteId, @Param("numero") int numero);

    // copie dell'utente in un insieme di carte (per esempio quelle di un binder)
    @Query("SELECT new com.example.ecommerce.payloads.CopiaDTO(c.oggetto.id, c.variante, c.quantita) "
            + "FROM CartaInCollezione c WHERE c.utente.id = :utenteId AND c.oggetto.id IN :oggettoIds")
    List<CopiaDTO> copieDelleCarte(@Param("utenteId") UUID utenteId, @Param("oggettoIds") Collection<UUID> oggettoIds);

    // cancellazione dell'account: la collezione va via prima dell'utente
    @Modifying
    @Query("DELETE FROM CartaInCollezione c WHERE c.utente.id = :utenteId")
    void deleteByUtenteId(@Param("utenteId") UUID utenteId);
}
