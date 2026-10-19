package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Variante;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// statistiche della collezione dell'utente: riquadro della pagina Binder e pagina /collezione
public record StatisticheDTO(Totali totali, Valore valore, List<AvanzamentoSetDTO> set, List<Integer> pokemon) {

    // copiePerVariante: solo le varianti con almeno una copia; carteNeiBinder conta le tasche occupate
    public record Totali(long carteDiverse, long copie, Map<Variante, Long> copiePerVariante,
                         int setIniziati, int setCompletati, long binder, long carteNeiBinder) {
    }

    // stima: un solo prezzo per carta, uguale per tutte le varianti
    public record Valore(BigDecimal totale, List<CartaPreziosaDTO> piuPreziose) {
    }

    // valore = prezzo × copie (tutte le varianti); nomeSet null per le carte senza set
    public record CartaPreziosaDTO(OggettoResponseDTO oggetto, String nomeSet, int copie, BigDecimal valore) {
    }

    // possedute = carte diverse del set con almeno una copia. Master: voci (carta, variante) di VariantiMaster con
    // almeno una copia di quella variante; null per i set non importati, di cui il catalogo ha solo qualche carta
    public record AvanzamentoSetDTO(String id, String nome, String serie, String simboloUrl, LocalDate dataUscita,
                                    int possedute, int totale, Integer posseduteMaster, Integer totaleMaster) {
    }
}
