package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.SlotBinder;

public record SlotBinderResponseDTO(int pagina, int posizione, OggettoResponseDTO oggetto) {

    public static SlotBinderResponseDTO from(SlotBinder slot) {
        return new SlotBinderResponseDTO(slot.getPagina(), slot.getPosizione(), OggettoResponseDTO.from(slot.getOggetto()));
    }
}
