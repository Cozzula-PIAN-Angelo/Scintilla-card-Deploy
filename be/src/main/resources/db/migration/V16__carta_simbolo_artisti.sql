-- carta simbolo di un illustratore, scelta dall'admin: il muro della pagina Illustratori ne ritaglia il disegno al
-- posto della scelta automatica. Si tiene l'id di TCGdex e non una chiave esterna: la carta può non essere in archivio
-- (database ricreato dal Secret File, che porta solo le carte usate dagli utenti) e allora vale la scelta automatica
CREATE TABLE artisti_carta_simbolo (
    slug       varchar(100)                NOT NULL,
    id_esterno varchar(255)                NOT NULL,
    scelta_il  timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_artisti_carta_simbolo PRIMARY KEY (slug)
);
