package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Binder;
import com.example.ecommerce.entities.MotivoBinder;

import java.time.Instant;
import java.util.UUID;

public record BinderResponseDTO(UUID id,
                                String nome,
                                int tasche,
                                int pagine,
                                String colore,
                                MotivoBinder motivo,
                                OggettoResponseDTO cartaCopertina,
                                // null senza immagine caricata; altrimenti fa da versione nell'URL dell'immagine
                                Instant immagineAggiornataIl,
                                long carteInserite,
                                Instant createdAt) {

    public static BinderResponseDTO from(Binder binder, long carteInserite) {
        return new BinderResponseDTO(
                binder.getId(),
                binder.getNome(),
                binder.getTasche(),
                binder.getPagine(),
                binder.getColore(),
                binder.getMotivo(),
                binder.getCartaCopertina() == null ? null : OggettoResponseDTO.from(binder.getCartaCopertina()),
                binder.getImmagineAggiornataIl(),
                carteInserite,
                binder.getCreatedAt()
        );
    }
}
