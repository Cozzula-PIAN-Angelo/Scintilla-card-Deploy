package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.MotivoBinder;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;

// validazione delle impostazioni del binder: il frontend le invia sempre tutte
class BinderDTOTest {

    private static ValidatorFactory fabbrica;
    private static Validator validator;

    @BeforeAll
    static void prepara() {
        fabbrica = Validation.buildDefaultValidatorFactory();
        validator = fabbrica.getValidator();
    }

    @AfterAll
    static void chiudi() {
        fabbrica.close();
    }

    @Test
    void impostazioniComplete() {
        assertThat(validator.validate(dati(true))).isEmpty();
    }

    // senza mostraMancanti il binder non saprebbe se mettere le mancanti in grigio: 400, non un null salvato
    @Test
    void mostraMancantiObbligatorio() {
        assertThat(validator.validate(dati(null)))
                .extracting(v -> v.getPropertyPath().toString(), ConstraintViolation::getMessage)
                .containsExactly(tuple("mostraMancanti", "Indica se mostrare le mancanti in grigio"));
    }

    private static BinderDTO dati(Boolean mostraMancanti) {
        return new BinderDTO("Prova", 9, 2, "#336699", MotivoBinder.STELLE, null, mostraMancanti, null, null, null, null);
    }
}
