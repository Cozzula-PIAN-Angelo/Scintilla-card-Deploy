-- Indici sulle foreign key che le letture e le cancellazioni frequenti usano: PostgreSQL non le
-- indicizza da solo, e senza indice ogni lettura scorrerebbe tutta la tabella delle carte, che con
-- gli import cresce a decine di migliaia di righe.
-- La pagina di un Pokémon (findByNumeroPokedex) non ne ha bisogno: la chiave primaria di
-- oggetti_pokedex comincia già da numero_pokedex

-- pagina di un set: OggettoRepository.findByEspansioneId
CREATE INDEX ix_oggetti_espansione_id ON oggetti (espansione_id);

-- numeri di Pokédex di una carta: caricamento della collezione numeriPokedex (import di set e Pokémon)
-- e cancellazione di una carta dal catalogo
CREATE INDEX ix_oggetti_pokedex_oggetto_id ON oggetti_pokedex (oggetto_id);
