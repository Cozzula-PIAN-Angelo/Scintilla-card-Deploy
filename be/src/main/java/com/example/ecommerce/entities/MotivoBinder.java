package com.example.ecommerce.entities;

// decorazione della copertina di un binder: il disegno vero e proprio lo fa il frontend
// i valori sono fissati anche nel vincolo ck_binder_motivo (V1): uno nuovo richiede una migrazione che lo allarghi
public enum MotivoBinder {
    NESSUNO,
    STELLE,
    FULMINI,
    POKEBALL,
    POIS,
    OLOGRAFICO
}
