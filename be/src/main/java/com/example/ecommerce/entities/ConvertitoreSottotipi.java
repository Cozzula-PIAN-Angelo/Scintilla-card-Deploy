package com.example.ecommerce.entities;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.List;

// sottotipi di una carta <-> testo separato da virgole ("Basic,ex").
// Mantiene la distinzione tra null (non ancora letti) e lista vuota (la fonte non ne indica): "" nel database
@Converter
public class ConvertitoreSottotipi implements AttributeConverter<List<String>, String> {

    @Override
    public String convertToDatabaseColumn(List<String> sottotipi) {
        return sottotipi == null ? null : String.join(",", sottotipi);
    }

    @Override
    public List<String> convertToEntityAttribute(String testo) {
        if (testo == null) {
            return null;
        }
        if (testo.isEmpty()) {
            return List.of();
        }
        return Arrays.asList(testo.split(","));
    }
}
