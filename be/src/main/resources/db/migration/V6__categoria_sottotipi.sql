-- Categoria (Pokémon, Allenatore, Energia) e sottotipi (Basic, ex, Tera, ...) della carta, da pokemontcg.io:
-- servono al frontend per applicare le maschere dell'effetto holo solo alle cornici misurate.

ALTER TABLE oggetti ADD COLUMN categoria varchar(20);
ALTER TABLE oggetti ADD COLUMN sottotipi varchar(200);
-- null = non ancora letti da pokemontcg.io; '' = pokemontcg.io non li indica; i sottotipi sono separati da virgola
