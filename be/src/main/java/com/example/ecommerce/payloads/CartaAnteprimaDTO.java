package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Oggetto;

import java.util.UUID;

// carta nella vetrina della home: solo quello che serve a mostrarla, col nome senza il dettaglio tra parentesi
public record CartaAnteprimaDTO(UUID id,
                                String nome,
                                // numero nel set (es. 152, R): con le carte ufficiali del set fa 152/128
                                String numero,
                                String rarita,
                                String immagineUrl,
                                String immagineUrlPiccola) {

    public static CartaAnteprimaDTO from(Oggetto carta) {
        return new CartaAnteprimaDTO(
                carta.getId(),
                nomeSenzaDettaglio(carta.getNome()),
                carta.getNumero(),
                carta.getRarita(),
                carta.getImmagineUrl(),
                OggettoResponseDTO.immaginePiccola(carta.getImmagineUrl())
        );
    }

    // "Mew ex (30th Celebration 152/128)" -> "Mew ex": il dettaglio tra parentesi lo aggiunge l'import
    // (CatalogoService) per rendere unici i nomi
    public static String nomeSenzaDettaglio(String nome) {
        int parentesi = nome.lastIndexOf(" (");
        return parentesi > 0 && nome.endsWith(")") ? nome.substring(0, parentesi) : nome;
    }
}
