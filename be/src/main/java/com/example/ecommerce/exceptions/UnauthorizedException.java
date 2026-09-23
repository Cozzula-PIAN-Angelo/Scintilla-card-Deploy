package com.example.ecommerce.exceptions;

// mappata su 401 dall'handler globale
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
