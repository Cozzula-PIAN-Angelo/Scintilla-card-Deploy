package com.example.ecommerce.exceptions;

// mappata su 409 dall'handler globale
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
