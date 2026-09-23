package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.ModificaOggettoDTO;
import com.example.ecommerce.payloads.NuovoOggettoDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OggettoService {

    private final OggettoRepository oggettoRepository;

    @Transactional(readOnly = true)
    public PageResponse<OggettoResponseDTO> findAll(Pageable pageable) {
        return PageResponse.from(oggettoRepository.findAll(pageable).map(OggettoResponseDTO::from));
    }

    @Transactional
    public OggettoResponseDTO crea(NuovoOggettoDTO body) {
        if (oggettoRepository.existsByNome(body.nome())) {
            throw new ConflictException("Esiste già un oggetto con nome '" + body.nome() + "'");
        }
        // flush immediato: così createdAt è valorizzato nella risposta
        Oggetto oggetto = oggettoRepository.saveAndFlush(new Oggetto(body.nome(), body.prezzo()));
        return OggettoResponseDTO.from(oggetto);
    }

    @Transactional
    public OggettoResponseDTO modifica(UUID id, ModificaOggettoDTO body) {
        Oggetto oggetto = findEntityById(id);

        if (body.nome() != null) {
            if (oggettoRepository.existsByNomeAndIdNot(body.nome(), id)) {
                throw new ConflictException("Esiste già un altro oggetto con nome '" + body.nome() + "'");
            }
            oggetto.setNome(body.nome());
        }
        if (body.prezzo() != null) {
            oggetto.setPrezzo(body.prezzo());
        }

        // entity gestita: le modifiche vengono salvate al commit
        return OggettoResponseDTO.from(oggetto);
    }

    @Transactional
    public void cancella(UUID id) {
        if (!oggettoRepository.existsById(id)) {
            throw new NotFoundException("Oggetto con id " + id + " non trovato");
        }
        // i preferiti collegati li elimina il DB (ON DELETE CASCADE)
        oggettoRepository.deleteById(id);
    }

    private Oggetto findEntityById(UUID id) {
        return oggettoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Oggetto con id " + id + " non trovato"));
    }
}
