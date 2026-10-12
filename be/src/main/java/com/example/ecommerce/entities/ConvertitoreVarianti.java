package com.example.ecommerce.entities;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.List;

// varianti di una carta <-> testo separato da virgole ("NORMALE,REVERSE_HOLO").
// Mantiene la distinzione tra null (non ancora lette) e lista vuota (la fonte non ne indica): "" nel database
@Converter
public class ConvertitoreVarianti implements AttributeConverter<List<Variante>, String> {

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
        return Arrays.stream(testo.split(",")).map(Variante::valueOf).toList();
    }
}
