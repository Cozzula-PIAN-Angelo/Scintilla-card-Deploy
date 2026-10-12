-- Collezione: carte possedute da ogni utente, una riga per (utente, carta, variante) con la quantità.
-- Le varianti che esistono per una carta (normale, reverse holo, ...) si salvano sulla carta stessa
-- e sui binder si aggiunge la scelta di mostrare o no le carte mancanti.

ALTER TABLE oggetti ADD COLUMN varianti varchar(120);
-- valori separati da virgola, es. 'NORMALE,REVERSE_HOLO'
-- null = non ancora lette da pokemontcg.io; '' = pokemontcg.io non ne indica

CREATE TABLE collezione (
    id uuid NOT NULL,
    id_utente uuid NOT NULL,
    id_oggetto uuid NOT NULL,
    variante varchar(30) NOT NULL,
    quantita integer NOT NULL,
    aggiornata_il timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_collezione PRIMARY KEY (id),
    CONSTRAINT uk_collezione_utente_oggetto_variante UNIQUE (id_utente, id_oggetto, variante),
    CONSTRAINT ck_collezione_variante CHECK (variante IN ('NORMALE', 'REVERSE_HOLO', 'HOLO', 'PRIMA_EDIZIONE', 'PRIMA_EDIZIONE_HOLO')),
    CONSTRAINT ck_collezione_quantita CHECK (quantita BETWEEN 1 AND 999),
    CONSTRAINT fk_collezione_utente FOREIGN KEY (id_utente) REFERENCES utenti (id) ON DELETE CASCADE,
    CONSTRAINT fk_collezione_oggetto FOREIGN KEY (id_oggetto) REFERENCES oggetti (id) ON DELETE CASCADE
);

-- l'indice su (id_utente, ...) lo dà già il vincolo unico; questo serve alla cancellazione di una carta
CREATE INDEX ix_collezione_id_oggetto ON collezione (id_oggetto);

-- i binder già esistenti continuano a mostrare le carte mancanti
ALTER TABLE binder ADD COLUMN mostra_mancanti boolean NOT NULL DEFAULT true;
