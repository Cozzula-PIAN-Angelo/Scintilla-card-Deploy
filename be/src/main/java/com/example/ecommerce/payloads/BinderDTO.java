package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.MotivoBinder;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

// impostazioni di un binder, in creazione e in modifica. Il frontend le invia sempre tutte:
// così cartaCopertinaId null significa "nessuna carta in copertina", non "lascia com'è"
public record BinderDTO(
        @NotBlank(message = "Il nome è obbligatorio")
        @Size(max = 40, message = "Il nome può avere al massimo 40 caratteri")
        String nome,

        // i valori ammessi (4, 9, 12) li controlla il service
        @NotNull(message = "Il numero di tasche per pagina è obbligatorio")
        Integer tasche,

        @NotNull(message = "Il numero di pagine è obbligatorio")
        @Min(value = 2, message = "Un binder ha almeno 2 pagine")
        @Max(value = 60, message = "Un binder ha al massimo 60 pagine")
        Integer pagine,

        @NotBlank(message = "Il colore è obbligatorio")
        @Pattern(regexp = "#[0-9a-fA-F]{6}", message = "Il colore deve essere nel formato #rrggbb")
        String colore,

        @NotNull(message = "Il motivo della copertina è obbligatorio")
        MotivoBinder motivo,

        UUID cartaCopertinaId
) {
}
