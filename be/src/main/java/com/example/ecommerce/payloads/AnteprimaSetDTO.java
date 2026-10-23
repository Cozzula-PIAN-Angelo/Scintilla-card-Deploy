package com.example.ecommerce.payloads;

import java.util.List;

// un set nella vetrina della home (vedi VetrinaService)
public record AnteprimaSetDTO(EspansioneResponseDTO espansione,
                              // dalla più preziosa, un Pokémon una volta sola; qualcuna in più di quelle mostrate,
                              // perché TCGdex non ha l'immagine di tutte (il frontend salta quelle che non si caricano)
                              List<CartaAnteprimaDTO> carteDiPunta,
                              // altre carte del set per lo sfondo della hero: solo per il primo set
                              List<CartaAnteprimaDTO> carteSfondo,
                              // le rarità importanti (dalle ultra rare in su), dalla più rara
                              List<RaritaContataDTO> raritaAmbite) {
}
