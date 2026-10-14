package com.example.ecommerce.services;

import com.example.ecommerce.entities.PokemonImportato;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.PokemonImportatoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PokedexService {

    private final OggettoRepository oggettoRepository;
    private final PokemonTcgService pokemonTcgService;
    // prima apertura, aggiornamento settimanale, limite e pausa dopo un errore: vedi ImportSettimanale
    private final ImportSettimanale<Integer> importSettimanale;

    // oltre l'ultimo Pokémon esistente non si interroga pokemontcg.io: ogni numero inventato
    // costerebbe una chiamata (e un posto nel limite degli import) senza trovare niente
    @Value("${app.pokedex.numero-massimo}")
    private int numeroMassimo;

    public PokedexService(OggettoRepository oggettoRepository, PokemonImportatoRepository pokemonImportatoRepository,
                          PokemonTcgService pokemonTcgService, LimitatoreImport limitatoreImport) {
        this.oggettoRepository = oggettoRepository;
        this.pokemonTcgService = pokemonTcgService;
        this.importSettimanale = new ImportSettimanale<>(limitatoreImport,
                numero -> pokemonImportatoRepository.findById(numero).map(PokemonImportato::getImportatoIl),
                (numero, data) -> pokemonImportatoRepository.save(new PokemonImportato(numero, data)),
                "Pokémon");
    }

    // carte in cui compare il Pokémon, dalla più recente; alla prima apertura si importano da pokemontcg.io.
    // client: IP del visitatore, per il limite sugli import
    public List<OggettoResponseDTO> carte(int numero, String client) {
        if (numero < 1 || numero > numeroMassimo) {
            throw new BadRequestException("Numero di Pokédex non valido: deve essere tra 1 e " + numeroMassimo);
        }

        importSettimanale.assicura(numero, client, () -> pokemonTcgService.importaPokemon(numero));

        return oggettoRepository.findByNumeroPokedex(numero).stream()
                .sorted(OrdineCarte.DALLA_PIU_RECENTE)
                .map(OggettoResponseDTO::from)
                .toList();
    }
}
