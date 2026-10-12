-- La blacklist dei token passa dal token intero al suo id (jti, presente in ogni token emesso):
-- 16 byte invece di fino a 512 caratteri, ricerca per chiave primaria, e un token alterato in fondo
-- ha comunque lo stesso jti, quindi resta revocato senza controlli sulla forma della firma.
-- La tabella si ricrea: le righe vecchie non hanno il jti, e i token revocati scadono comunque entro 7 giorni
DROP TABLE token_revocati;

CREATE TABLE token_revocati (
    jti      uuid                        NOT NULL,
    -- scadenza originale del JWT: dopo questa data la riga la elimina la pulizia notturna
    scadenza timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_token_revocati PRIMARY KEY (jti)
);
