package com.example.ecommerce.entities;

import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class UtenteTest {

    @Test
    void normalizzaEmailInMinuscoloESenzaSpazi() {
        assertThat(Utente.normalizzaEmail("  Mario.Rossi@Esempio.IT ")).isEqualTo("mario.rossi@esempio.it");
    }

    @Test
    void normalizzaEmailNonDipendeDallaLinguaDelSistema() {
        Locale predefinita = Locale.getDefault();
        try {
            // in turco "I".toLowerCase() è "ı" (senza puntino): con Locale.ROOT resta "i"
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertThat(Utente.normalizzaEmail("INFO@ESEMPIO.IT")).isEqualTo("info@esempio.it");
        } finally {
            Locale.setDefault(predefinita);
        }
    }
}
