package com.example.ecommerce.security;

import com.example.ecommerce.exceptions.ErrorResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

// le eccezioni nei filtri non arrivano al @RestControllerAdvice: qui si scrive a mano
// lo stesso JSON di ErrorResponseDTO, così il client riceve sempre lo stesso formato
@Component
@RequiredArgsConstructor
public class ErroreJsonWriter {

    // l'ObjectMapper di Spring serializza già Instant in formato ISO-8601
    private final ObjectMapper objectMapper;

    public void scrivi(HttpServletResponse response, int status, String messaggio) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getOutputStream(), new ErrorResponseDTO(messaggio));
    }
}
