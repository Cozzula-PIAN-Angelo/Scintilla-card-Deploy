package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.PokemonImportato;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.PokemonImportatoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PokedexService {

    private final OggettoRepository oggettoRepository;
    private final CatalogoService catalogoService;
    // prima apertura, aggiornamento settimanale, limite e pausa dopo un errore: vedi ImportSettimanale
    private final ImportSettimanale<Integer> importSettimanale;

    // oltre l'ultimo Pokémon esistente non si interroga TCGdex: ogni numero inventato
    // costerebbe una chiamata (e un posto nel limite degli import) senza trovare niente
    @Value("${app.pokedex.numero-massimo}")
    private int numeroMassimo;

    public PokedexService(OggettoRepository oggettoRepository, PokemonImportatoRepository pokemonImportatoRepository,
                          CatalogoService catalogoService, ImportInBackground importInBackground) {
        this.oggettoRepository = oggettoRepository;
        this.catalogoService = catalogoService;
        this.importSettimanale = new ImportSettimanale<>(importInBackground,
                numero -> pokemonImportatoRepository.findById(numero).map(PokemonImportato::getImportatoIl),
                (numero, data) -> pokemonImportatoRepository.save(new PokemonImportato(numero, data)),
                "Pokémon");
    }

    // carte in cui compare il Pokémon, dalla più recente. Alla prima apertura solo la pagina chiesta (da 0), presa al
    // volo da TCGdex mentre le altre si scaricano in background. client: IP del visitatore, per il limite sugli import
    public CarteDTO carte(int numero, Integer pagina, String client) {
        if (numero < 1 || numero > numeroMassimo) {
            throw new BadRequestException("Numero di Pokédex non valido: deve essere tra 1 e " + numeroMassimo);
        }
        int numeroPagina = OrdineCarte.pagina(pagina);

        ImportSettimanale.Stato stato = importSettimanale.assicura(numero, client, () -> catalogoService.importaPokemon(numero));
        if (stato.completo()) {
            return CarteDTO.completo(ordinate(oggettoRepository.findByNumeroPokedex(numero)));
        }
        CatalogoService.PaginaCarte alVolo = catalogoService.paginaCarte(FiltroCarte.diPokemon(numero), numeroPagina, true);
        return new CarteDTO(false, alVolo.totale(), ordinate(alVolo.carte()), stato.fallito());
    }

    // per il controllo periodico del frontend: niente chiamate esterne nella richiesta. Se lo scaricamento è fermo
    // (pausa dopo un errore finita, server riavviato) lo rilancia in background; col limite raggiunto niente 429
    public StatoCarteDTO stato(int numero, String client) {
        if (numero < 1 || numero > numeroMassimo) {
            throw new BadRequestException("Numero di Pokédex non valido: deve essere tra 1 e " + numeroMassimo);
        }
        try {
            importSettimanale.assicura(numero, client, () -> catalogoService.importaPokemon(numero));
        } catch (TroppeRichiesteException ex) {
            // si riprova al controllo dopo
        }
        ImportSettimanale.Stato stato = importSettimanale.stato(numero);
        return new StatoCarteDTO(stato.completo(), stato.fallito());
    }

    private static List<OggettoResponseDTO> ordinate(List<Oggetto> carte) {
        return carte.stream()
                .sorted(OrdineCarte.DALLA_PIU_RECENTE)
                .map(OggettoResponseDTO::from)
                .toList();
    }
}
