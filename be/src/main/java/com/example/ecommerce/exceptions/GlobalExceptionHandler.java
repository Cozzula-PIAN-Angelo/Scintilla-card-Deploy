package com.example.ecommerce.exceptions;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponseDTO handleNotFound(NotFoundException ex) {
        return new ErrorResponseDTO(ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponseDTO handleConflict(ConflictException ex) {
        return new ErrorResponseDTO(ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponseDTO handleBadRequest(BadRequestException ex) {
        return new ErrorResponseDTO(ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponseDTO handleUnauthorized(UnauthorizedException ex) {
        return new ErrorResponseDTO(ex.getMessage());
    }

    // il dettaglio dell'errore originale è già loggato nel service
    @ExceptionHandler(ServizioEsternoException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public ErrorResponseDTO handleServizioEsterno(ServizioEsternoException ex) {
        return new ErrorResponseDTO("Servizio carte non disponibile, riprova più tardi");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorsListResponseDTO handleValidation(MethodArgumentNotValidException ex) {
        // se un campo viola più vincoli si tiene il primo messaggio
        Map<String, String> errori = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        errore -> errore.getDefaultMessage() == null ? "Valore non valido" : errore.getDefaultMessage(),
                        (primo, secondo) -> primo,
                        LinkedHashMap::new
                ));
        return new ErrorsListResponseDTO("Errore di validazione", errori);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponseDTO handleBodyNonLeggibile(HttpMessageNotReadableException ex) {
        return new ErrorResponseDTO("Body della richiesta mancante o JSON non valido");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponseDTO handleTipoNonValido(MethodArgumentTypeMismatchException ex) {
        return new ErrorResponseDTO("Valore '" + ex.getValue() + "' non valido per il parametro '" + ex.getName() + "'");
    }

    // lanciata da @PreAuthorize quando l'utente autenticato non ha il ruolo richiesto
    @ExceptionHandler(AuthorizationDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponseDTO handleAccessoNegato(AuthorizationDeniedException ex) {
        return new ErrorResponseDTO("Non hai i permessi per eseguire questa operazione");
    }

    // violazione di un vincolo del DB non intercettata dai controlli nel service,
    // tipicamente due richieste simultanee sullo stesso UNIQUE
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponseDTO handleIntegrita(DataIntegrityViolationException ex) {
        log.warn("Violazione di integrità dei dati: {}", ex.getMostSpecificCause().getMessage());
        return new ErrorResponseDTO("La risorsa è in conflitto con dati già esistenti");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleGenerica(Exception ex) {
        // le eccezioni di Spring MVC (404 rotta inesistente, 405 metodo non supportato, 415...)
        // hanno già il loro status: senza questo controllo diventerebbero tutte 500
        if (ex instanceof ErrorResponse errorResponse) {
            return ResponseEntity.status(errorResponse.getStatusCode())
                    .body(new ErrorResponseDTO(errorResponse.getBody().getDetail()));
        }

        log.error("Errore non gestito", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponseDTO("Errore interno del server"));
    }
}
