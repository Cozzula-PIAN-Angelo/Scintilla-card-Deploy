-- vetrina della home: numero di carte ufficiali di TCGdex (cardCount.official; quelle oltre sono le segrete) e
-- descrizione del set scritta dall'admin (null = nessuna). Le carte ufficiali le scrive la sincronizzazione
ALTER TABLE espansioni ADD COLUMN carte_ufficiali integer;
ALTER TABLE espansioni ADD COLUMN descrizione varchar(600);
