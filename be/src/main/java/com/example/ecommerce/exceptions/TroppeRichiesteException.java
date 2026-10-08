package com.example.ecommerce.exceptions;

// mappata su 429 dall'handler globale
public class TroppeRichiesteException extends RuntimeException {

    public TroppeRichiesteException(String message) {
        super(message);
    }
}
