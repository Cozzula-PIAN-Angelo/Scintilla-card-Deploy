-- set digitali (Pokémon TCG Pocket, gioco per telefono): li scrive la sincronizzazione. Quelli già entrati con le
-- carte di un Pokémon o di un artista sono rimasti senza serie: fuori da TCG Pocket nessun id di set ha maiuscole
ALTER TABLE espansioni ADD COLUMN digitale boolean NOT NULL DEFAULT false;
UPDATE espansioni SET digitale = true, serie = 'TCG Pocket' WHERE id ~ '[A-Z]';
