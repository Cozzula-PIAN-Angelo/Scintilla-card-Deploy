package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.function.UnaryOperator;

@Component
public class PaginationHelper {

    private static final Set<String> CAMPI_ORDINABILI = Set.of("nome", "prezzo", "createdAt");
    private static final String CAMPO_DEFAULT = "createdAt";

    private final int defaultSize;
    private final int maxSize;

    public PaginationHelper(@Value("${app.pagination.default-size}") int defaultSize,
                            @Value("${app.pagination.max-size}") int maxSize) {
        this.defaultSize = defaultSize;
        this.maxSize = maxSize;
    }

    public Pageable perOggetti(Integer page, Integer size, String sort) {
        return crea(page, size, sort, UnaryOperator.identity());
    }

    // nei preferiti nome e prezzo appartengono all'oggetto collegato,
    // mentre createdAt è la data di aggiunta ai preferiti
    public Pageable perPreferiti(Integer page, Integer size, String sort) {
        return crea(page, size, sort, campo -> campo.equals("createdAt") ? campo : "oggetto." + campo);
    }

    // utenti sempre in ordine alfabetico di username: nessun parametro sort
    public Pageable perUtenti(Integer page, Integer size) {
        return PageRequest.of(numeroPagina(page), dimensione(size), Sort.by("username"));
    }

    private Pageable crea(Integer page, Integer size, String sort, UnaryOperator<String> proprietaDaCampo) {
        return PageRequest.of(numeroPagina(page), dimensione(size), creaSort(sort, proprietaDaCampo));
    }

    private int numeroPagina(Integer page) {
        int numeroPagina = page == null ? 0 : page;
        if (numeroPagina < 0) {
            throw new BadRequestException("Il parametro page non può essere negativo");
        }
        return numeroPagina;
    }

    private int dimensione(Integer size) {
        int dimensione = size == null ? defaultSize : size;
        if (dimensione < 1) {
            throw new BadRequestException("Il parametro size deve essere almeno 1");
        }
        // oltre il massimo non si risponde 400: la size viene limitata
        return Math.min(dimensione, maxSize);
    }

    // formato atteso: "campo" oppure "campo,direzione" (direzione asc/desc, default asc)
    private Sort creaSort(String sort, UnaryOperator<String> proprietaDaCampo) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, proprietaDaCampo.apply(CAMPO_DEFAULT));
        }

        String[] parti = sort.split(",");
        if (parti.length > 2) {
            throw new BadRequestException("Formato di sort non valido: usa \"campo,direzione\"");
        }

        String campo = parti[0].trim();
        if (!CAMPI_ORDINABILI.contains(campo)) {
            throw new BadRequestException("Campo di ordinamento non ammesso: '" + campo
                    + "'. Valori ammessi: nome, prezzo, createdAt");
        }

        Sort.Direction direzione = Sort.Direction.ASC;
        if (parti.length == 2) {
            direzione = Sort.Direction.fromOptionalString(parti[1].trim())
                    .orElseThrow(() -> new BadRequestException("Direzione di ordinamento non valida: usa asc o desc"));
        }

        return Sort.by(direzione, proprietaDaCampo.apply(campo));
    }
}
