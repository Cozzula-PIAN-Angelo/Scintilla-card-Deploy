-- Via le varianti Holo e 1ª edizione holo: su una rara holo la stampa holo è quella normale.
-- Holo diventa Normale e 1ª edizione holo diventa 1ª edizione, sia nella collezione sia nelle varianti delle carte.

-- copie in collezione: se l'utente ha già la riga di arrivo per la stessa carta, le quantità si sommano lì
-- (al massimo 999, come da ck_collezione_quantita) e la riga Holo si cancella
UPDATE collezione arrivo
SET quantita = LEAST(arrivo.quantita + holo.quantita, 999),
    aggiornata_il = GREATEST(arrivo.aggiornata_il, holo.aggiornata_il)
FROM collezione holo
WHERE holo.id_utente = arrivo.id_utente
  AND holo.id_oggetto = arrivo.id_oggetto
  AND ((holo.variante = 'HOLO' AND arrivo.variante = 'NORMALE')
    OR (holo.variante = 'PRIMA_EDIZIONE_HOLO' AND arrivo.variante = 'PRIMA_EDIZIONE'));

DELETE FROM collezione holo
USING collezione arrivo
WHERE holo.id_utente = arrivo.id_utente
  AND holo.id_oggetto = arrivo.id_oggetto
  AND ((holo.variante = 'HOLO' AND arrivo.variante = 'NORMALE')
    OR (holo.variante = 'PRIMA_EDIZIONE_HOLO' AND arrivo.variante = 'PRIMA_EDIZIONE'));

-- le righe Holo rimaste non hanno una riga di arrivo: basta rinominarle
UPDATE collezione
SET variante = CASE variante WHEN 'HOLO' THEN 'NORMALE' ELSE 'PRIMA_EDIZIONE' END
WHERE variante IN ('HOLO', 'PRIMA_EDIZIONE_HOLO');

ALTER TABLE collezione DROP CONSTRAINT ck_collezione_variante;
ALTER TABLE collezione ADD CONSTRAINT ck_collezione_variante CHECK (variante IN ('NORMALE', 'REVERSE_HOLO', 'PRIMA_EDIZIONE'));

-- varianti delle carte ('NORMALE,REVERSE_HOLO,...'): stessa conversione, senza doppioni e nell'ordine dell'enum Variante
UPDATE oggetti
SET varianti = (
    SELECT string_agg(ordine.variante, ',' ORDER BY ordine.posizione)
    FROM (VALUES ('NORMALE', 1), ('REVERSE_HOLO', 2), ('PRIMA_EDIZIONE', 3)) AS ordine (variante, posizione)
    WHERE ordine.variante IN (
        SELECT CASE token WHEN 'HOLO' THEN 'NORMALE' WHEN 'PRIMA_EDIZIONE_HOLO' THEN 'PRIMA_EDIZIONE' ELSE token END
        FROM unnest(string_to_array(oggetti.varianti, ',')) AS token
    )
)
WHERE varianti ~ '(^|,)(HOLO|PRIMA_EDIZIONE_HOLO)(,|$)';
