-- Rarità della carta (Double Rare, Illustration Rare, ...), da pokemontcg.io: serve al frontend
-- per scegliere dove mettere l'effetto holo (cornice normale, ex, full art).

ALTER TABLE oggetti ADD COLUMN rarita varchar(60);
-- null = non ancora letta da pokemontcg.io; '' = pokemontcg.io non la indica
