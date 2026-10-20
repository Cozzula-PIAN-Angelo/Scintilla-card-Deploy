package com.example.ecommerce.services;

import com.example.ecommerce.entities.Variante;

import java.util.List;

// Varianti del master set: Normale più Reverse holo dove esiste. Le varianti vengono da TCGdex (variants della
// carta). La stessa regola è in fe/src/features/collezione/varianti.ts (variantiMaster): vanno cambiate insieme
public final class VariantiMaster {

    private VariantiMaster() {
    }

    // mai vuota: per il master ogni carta vale almeno una voce. La 1ª edizione non fa parte del master set;
    // varianti mai lette (null) o vuote valgono la sola Normale
    public static List<Variante> effettive(List<Variante> lette) {
        List<Variante> master = lette == null ? List.of()
                : lette.stream().filter(v -> v != Variante.PRIMA_EDIZIONE).sorted().toList();
        return master.isEmpty() ? List.of(Variante.NORMALE) : master;
    }
}
