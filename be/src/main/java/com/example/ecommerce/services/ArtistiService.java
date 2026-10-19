package com.example.ecommerce.services;

import com.example.ecommerce.entities.ArtistaImportato;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.ArtistaResponseDTO;
import com.example.ecommerce.payloads.CarteDTO;
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
                          PokemonTcgService pokemonTcgService, ImportInBackground importInBackground,
                          ElencoArtisti elencoArtisti) {
        this.oggettoRepository = oggettoRepository;
        this.pokemonTcgService = pokemonTcgService;
        this.elencoArtisti = elencoArtisti;
        this.importSettimanale = new ImportSettimanale<>(importInBackground,
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

    // carte dell'artista, dalla più recente. Alla prima apertura solo la pagina chiesta (da 0), presa al volo da
    // pokemontcg.io mentre le altre si scaricano in background; lo sconosciuto non ha una query di pagina e aspetta.
    // Uno slug fuori dall'elenco non costa chiamate a pokemontcg.io. client: IP del visitatore, per il limite sugli import
    public CarteDTO carte(String slug, Integer pagina, String client) {
        int numeroPagina = OrdineCarte.pagina(pagina);
        if (ElencoArtisti.SLUG_SCONOSCIUTO.equals(slug)) {
            ImportSettimanale.Stato stato = importSettimanale.assicura(slug, client, pokemonTcgService::importaSenzaArtista);
            return stato.completo()
                    ? CarteDTO.completo(ordinate(oggettoRepository.findSenzaArtista()))
                    : new CarteDTO(false, 0, List.of(), stato.fallito());
        }
        ElencoArtisti.Artista artista = elencoArtisti.perSlug(slug)
                .orElseThrow(() -> new NotFoundException("Artista non trovato: " + slug));
        ImportSettimanale.Stato stato = importSettimanale.assicura(slug, client, () -> pokemonTcgService.importaArtista(artista.query()));
        if (stato.completo()) {
            return CarteDTO.completo(ordinate(oggettoRepository.findByArtistaIn(artista.grafie())));
        }
        PokemonTcgService.PaginaCarte alVolo = pokemonTcgService.paginaCarte(artista.query(), numeroPagina, OrdineCarte.PIU_RECENTI_API);
        return new CarteDTO(false, alVolo.totale(), ordinate(alVolo.carte()), stato.fallito());
    }

    private static List<OggettoResponseDTO> ordinate(List<Oggetto> carte) {
        return carte.stream()
                .sorted(OrdineCarte.DALLA_PIU_RECENTE)
                .map(OggettoResponseDTO::from)
                .toList();
    }
}
