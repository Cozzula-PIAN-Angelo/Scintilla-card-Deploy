package com.example.ecommerce.payloads;

import java.util.List;

// binder aperto: impostazioni più tutte le tasche occupate (quelle vuote non compaiono)
public record BinderDettaglioDTO(BinderResponseDTO binder, List<SlotBinderResponseDTO> slot) {
}
