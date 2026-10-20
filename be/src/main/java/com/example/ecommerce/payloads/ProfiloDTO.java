package com.example.ecommerce.payloads;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// profilo dell'utente, senza email: è già la forma che avrà la futura pagina pubblica.
// iscrittoIl null per gli account creati prima che si salvasse; squadra.get(0) è il compagno
public record ProfiloDTO(UUID id,
                         String username,
                         Instant iscrittoIl,
                         // null senza immagine; altrimenti fa da versione nell'URL dell'immagine
                         Instant avatarAggiornatoIl,
                         String bio,
                         String colore,
                         List<Integer> squadra,
                         List<OggettoResponseDTO> vetrina,
                         List<BinderResponseDTO> binder,
                         RiepilogoDTO riepilogo) {

    // i numeri della collezione mostrati nel profilo
    public record RiepilogoDTO(long carteDiverse, int setCompletati, int pokemonPosseduti, long binder) {
    }
}
