package com.example.ecommerce.payloads;

// una rarità del set, quante carte ne ha e quanto è ambita (vedi GradoRarita): il frontend ne sceglie il colore
public record RaritaContataDTO(String rarita, int quante, int grado) {
}
