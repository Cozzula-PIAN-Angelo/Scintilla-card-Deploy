package com.example.ecommerce.payloads;

import java.math.BigDecimal;

// prezzi di Cardmarket in euro per una variante. minimo: l'offerta più bassa; massimo: il più alto tra media, trend
// e medie a 1/7/30 giorni. trend e media30 null quando Cardmarket non li ha
public record FasciaPrezzoDTO(BigDecimal minimo, BigDecimal massimo, BigDecimal trend, BigDecimal media30) {
}
