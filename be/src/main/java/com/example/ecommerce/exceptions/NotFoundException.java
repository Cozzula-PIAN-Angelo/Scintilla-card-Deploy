package com.example.ecommerce.exceptions;

// mappata su 404 dall'handler globale
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
