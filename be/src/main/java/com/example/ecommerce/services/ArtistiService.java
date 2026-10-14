package com.example.ecommerce.services;

import com.example.ecommerce.entities.ArtistaImportato;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.ArtistaResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.ArtistaImportatoRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Stream;

// sezione Artisti: elenco da artisti.json, carte di ogni artista importate da pokemontcg.io alla prima apertura
// e riscaricate dopo una settimana, come le carte di un Pokémon
@Service
public class ArtistiService {

    private final OggettoRepository oggettoRepository;
    private final PokemonTcgService pokemonTcgService;
    private final ElencoArtisti elencoArtisti;
    private final ImportSettimanale<String> importSettimanale;

    public ArtistiService(OggettoRepository oggettoRepository, ArtistaImportatoRepository artistaImportatoRepository,
                          PokemonTcgService pokemonTcgService, LimitatoreImport limitatoreImport,
                          ElencoArtisti elencoArtisti) {
        this.oggettoRepository = oggettoRepository;
        this.pokemonTcgService = pokemonTcgService;
        this.elencoArtisti = elencoArtisti;
        this.importSettimanale = new ImportSettimanale<>(limitatoreImport,
                slug -> artistaImportatoRepository.findById(slug).map(ArtistaImportato::getImportatoIl),
                (slug, data) -> artistaImportatoRepository.save(new ArtistaImportato(slug, data)),
                "artista");
    }

    // in ordine alfabetico, con "Artista sconosciuto" in fondo
    public List<ArtistaResponseDTO> elenco() {
        return Stream.concat(
                elencoArtisti.elenco().stream()
                        .map(artista -> new ArtistaResponseDTO(artista.slug(), artista.nome(), artista.carte(), artista.avatar())),
                Stream.of(new ArtistaResponseDTO(ElencoArtisti.SLUG_SCONOSCIUTO, ElencoArtisti.NOME_SCONOSCIUTO,
                        elencoArtisti.sconosciuti(), null))
        ).toList();
    }

    // carte dell'artista, dalla più recente. Uno slug fuori dall'elenco non costa chiamate a pokemontcg.io.
    // client: IP del visitatore, per il limite sugli import
    public List<OggettoResponseDTO> carte(String slug, String client) {
        List<Oggetto> carte;
        if (ElencoArtisti.SLUG_SCONOSCIUTO.equals(slug)) {
            importSettimanale.assicura(slug, client, pokemonTcgService::importaSenzaArtista);
            carte = oggettoRepository.findSenzaArtista();
        } else {
            ElencoArtisti.Artista artista = elencoArtisti.perSlug(slug)
                    .orElseThrow(() -> new NotFoundException("Artista non trovato: " + slug));
            importSettimanale.assicura(slug, client, () -> pokemonTcgService.importaArtista(artista.query()));
            carte = oggettoRepository.findByArtistaIn(artista.grafie());
        }
        return carte.stream()
                .sorted(OrdineCarte.DALLA_PIU_RECENTE)
                .map(OggettoResponseDTO::from)
                .toList();
    }
}
