package com.example.ecommerce.payloads;

import java.math.BigDecimal;

public record CartaEsternaDTO(String idEsterno,
                              String nome,
                              String espansione,
                              String numero,
                              String rarita,
                              String immagineUrl,
                              BigDecimal prezzoSuggerito,
                              boolean giaImportata) {
}
