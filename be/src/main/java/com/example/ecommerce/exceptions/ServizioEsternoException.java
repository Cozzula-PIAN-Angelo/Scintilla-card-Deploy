package com.example.ecommerce.exceptions;

// mappata su 502 dall'handler globale: l'API esterna non risponde o risponde con un errore
public class ServizioEsternoException extends RuntimeException {

    public ServizioEsternoException(String message, Throwable cause) {
        super(message, cause);
    }
}
