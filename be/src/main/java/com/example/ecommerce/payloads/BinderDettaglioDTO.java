package com.example.ecommerce.payloads;

import java.util.List;

// binder aperto: impostazioni, tutte le tasche occupate (quelle vuote non compaiono)
// e le copie possedute dall'utente delle carte nelle tasche
public record BinderDettaglioDTO(BinderResponseDTO binder, List<SlotBinderResponseDTO> slot, List<CopiaDTO> collezione) {
}
