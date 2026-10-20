package com.example.ecommerce.payloads;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// username ed email, con le stesse regole della registrazione; la password conferma che è davvero il titolare
public record ModificaAccountDTO(
        @NotBlank(message = "Lo username è obbligatorio")
        @Size(min = 3, max = 30, message = "Lo username deve avere tra 3 e 30 caratteri")
        @Pattern(regexp = "[^@]*", message = "Lo username non può contenere il carattere @")
        String username,

        @NotBlank(message = "L'email è obbligatoria")
        @Email(message = "L'email non è valida")
        String email,

        @NotBlank(message = "La password attuale è obbligatoria")
        String passwordAttuale
) {
}
