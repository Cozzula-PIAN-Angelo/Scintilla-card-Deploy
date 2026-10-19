package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.SlotBinder;
import com.example.ecommerce.entities.Variante;

// variante null = una qualsiasi; NORMALE o REVERSE_HOLO nel binder del master set
public record SlotBinderResponseDTO(int pagina, int posizione, OggettoResponseDTO oggetto, Variante variante) {

    public static SlotBinderResponseDTO from(SlotBinder slot) {
        return new SlotBinderResponseDTO(slot.getPagina(), slot.getPosizione(), OggettoResponseDTO.from(slot.getOggetto()),
                slot.getVariante());
    }
}
