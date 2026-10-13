package com.example.ecommerce.entities;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

// varianti di una carta <-> testo separato da virgole ("NORMALE,REVERSE_HOLO").
// Mantiene la distinzione tra null (non ancora lette) e lista vuota (la fonte non ne indica): "" nel database
@Slf4j
@Converter
public class ConvertitoreVarianti implements AttributeConverter<List<Variante>, String> {

    private static final Set<String> NOTE = Arrays.stream(Variante.values()).map(Variante::name).collect(Collectors.toSet());

    @Override
    public String convertToDatabaseColumn(List<Variante> varianti) {
        if (varianti == null) {
            return null;
        }
        return String.join(",", varianti.stream().map(Variante::name).toList());
    }

    @Override
    public List<Variante> convertToEntityAttribute(String testo) {
        if (testo == null) {
            return null;
        }
        if (testo.isEmpty()) {
            return List.of();
        }
        // una variante sconosciuta (es. HOLO in un database non migrato alla V6) si salta: con valueOf
        // un solo valore vecchio renderebbe illeggibile tutta la carta
        return Arrays.stream(testo.split(","))
                .filter(nome -> {
                    boolean nota = NOTE.contains(nome);
                    if (!nota) {
                        log.warn("Variante sconosciuta \"{}\" ignorata (varianti: \"{}\")", nome, testo);
                    }
                    return nota;
                })
                .map(Variante::valueOf)
                .toList();
    }
}
