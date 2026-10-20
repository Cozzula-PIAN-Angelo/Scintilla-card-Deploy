-- Profilo dell'utente: dati della vetrina (pensati per diventare pubblici) separati da email e password.
-- La riga di profili si crea al primo salvataggio. Le liste sono ordinate per posizione; una carta o un
-- binder cancellati spariscono da soli (CASCADE) e possono lasciare buchi, innocui: si ordina per posizione

-- data di registrazione: null per gli account creati prima di questa migrazione
ALTER TABLE utenti ADD COLUMN created_at timestamp(6) with time zone;
-- ultimo cambio password: i token emessi prima non valgono più (JWTFilter)
ALTER TABLE utenti ADD COLUMN password_cambiata_il timestamp(6) with time zone;

CREATE TABLE profili (
    id_utente            uuid                        NOT NULL,
    bio                  character varying(160),
    colore               character varying(7),
    -- data dell'ultima immagine profilo, null se non c'è: fa da versione nell'URL
    avatar_aggiornato_il timestamp(6) with time zone,
    CONSTRAINT pk_profili PRIMARY KEY (id_utente),
    CONSTRAINT fk_profili_utente FOREIGN KEY (id_utente) REFERENCES utenti (id) ON DELETE CASCADE
);

-- immagine profilo, già ritagliata e compressa dal browser; a parte, come binder_immagini
CREATE TABLE profili_avatar (
    id_utente    uuid                  NOT NULL,
    contenuto    bytea                 NOT NULL,
    content_type character varying(20) NOT NULL,
    CONSTRAINT pk_profili_avatar PRIMARY KEY (id_utente),
    CONSTRAINT fk_profili_avatar_utente FOREIGN KEY (id_utente) REFERENCES utenti (id) ON DELETE CASCADE
);

-- squadra: fino a 6 numeri del Pokédex nazionale; il primo è il compagno
CREATE TABLE profili_squadra (
    id_utente uuid    NOT NULL,
    posizione integer NOT NULL,
    numero    integer NOT NULL,
    CONSTRAINT pk_profili_squadra PRIMARY KEY (id_utente, posizione),
    CONSTRAINT uk_profili_squadra_numero UNIQUE (id_utente, numero),
    CONSTRAINT ck_profili_squadra_posizione CHECK (posizione BETWEEN 0 AND 5),
    CONSTRAINT ck_profili_squadra_numero CHECK (numero BETWEEN 1 AND 1025),
    CONSTRAINT fk_profili_squadra_profilo FOREIGN KEY (id_utente) REFERENCES profili (id_utente) ON DELETE CASCADE
);

-- vetrina: fino a 6 carte scelte a mano, separate dai preferiti col cuore
CREATE TABLE profili_vetrina (
    id_utente  uuid    NOT NULL,
    posizione  integer NOT NULL,
    id_oggetto uuid    NOT NULL,
    CONSTRAINT pk_profili_vetrina PRIMARY KEY (id_utente, posizione),
    CONSTRAINT uk_profili_vetrina_oggetto UNIQUE (id_utente, id_oggetto),
    CONSTRAINT ck_profili_vetrina_posizione CHECK (posizione BETWEEN 0 AND 5),
    CONSTRAINT fk_profili_vetrina_profilo FOREIGN KEY (id_utente) REFERENCES profili (id_utente) ON DELETE CASCADE,
    CONSTRAINT fk_profili_vetrina_oggetto FOREIGN KEY (id_oggetto) REFERENCES oggetti (id) ON DELETE CASCADE
);

-- binder in evidenza: fino a 3 binder dell'utente (che siano suoi lo controlla ProfiloService)
CREATE TABLE profili_binder (
    id_utente uuid    NOT NULL,
    posizione integer NOT NULL,
    id_binder uuid    NOT NULL,
    CONSTRAINT pk_profili_binder PRIMARY KEY (id_utente, posizione),
    CONSTRAINT uk_profili_binder_binder UNIQUE (id_utente, id_binder),
    CONSTRAINT ck_profili_binder_posizione CHECK (posizione BETWEEN 0 AND 2),
    CONSTRAINT fk_profili_binder_profilo FOREIGN KEY (id_utente) REFERENCES profili (id_utente) ON DELETE CASCADE,
    CONSTRAINT fk_profili_binder_binder FOREIGN KEY (id_binder) REFERENCES binder (id) ON DELETE CASCADE
);
