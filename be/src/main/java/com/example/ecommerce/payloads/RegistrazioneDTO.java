package com.example.ecommerce.payloads;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrazioneDTO(
        @NotBlank(message = "Lo username è obbligatorio")
        @Size(min = 3, max = 30, message = "Lo username deve avere tra 3 e 30 caratteri")
        // senza '@' uno username non può coincidere con l'email di un altro utente al login
        @Pattern(regexp = "[^@]*", message = "Lo username non può contenere il carattere @")
        String username,

        @NotBlank(message = "L'email è obbligatoria")
        @Email(message = "L'email non è valida")
        String email,

        // BCrypt considera solo i primi 72 byte: oltre, Spring Security rifiuta la password.
        // @Size conta i caratteri: il limite in byte (lettere accentate = 2 byte) lo controlla UtenteService
        @NotBlank(message = "La password è obbligatoria")
        @Size(min = 8, max = 72, message = "La password deve avere tra 8 e 72 caratteri")
        String password
) {
}
