-- Rarità della carta (Double Rare, Illustration Rare, ...), da pokemontcg.io: serve al frontend
-- per scegliere l'effetto della carta (arcobaleno sulle più rare, specchio a scelta su Common, Uncommon e Rare).

ALTER TABLE oggetti ADD COLUMN rarita varchar(60);
-- null = non ancora letta da pokemontcg.io; '' = pokemontcg.io non la indica
