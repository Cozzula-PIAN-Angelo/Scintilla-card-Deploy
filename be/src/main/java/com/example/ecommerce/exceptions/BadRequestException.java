package com.example.ecommerce.exceptions;

// mappata su 400 dall'handler globale
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
