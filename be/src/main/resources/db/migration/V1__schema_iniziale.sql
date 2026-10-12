-- Schema iniziale di Scintilla: lo stesso che Hibernate generava dalle entity con ddl-auto=update
-- (ricavato con pg_dump da un database creato da Hibernate). Tipi e nullabilità devono restare quelli
-- delle entity: all'avvio Hibernate li controlla (ddl-auto=validate) e, se non coincidono, l'app non parte.
-- Le regole ON DELETE sono quelle delle annotazioni @OnDelete: le cancellazioni a cascata le fa il database.

-- account; quelli cancellati restano anonimizzati (anonimizzato_il valorizzato)
CREATE TABLE utenti (
    id              uuid                        NOT NULL,
    username        character varying(255)      NOT NULL,
    email           character varying(255)      NOT NULL,
    password        character varying(60)       NOT NULL,
    anonimizzato_il timestamp(6) with time zone,
    CONSTRAINT pk_utenti PRIMARY KEY (id),
    CONSTRAINT uk_utenti_username UNIQUE (username),
    CONSTRAINT uk_utenti_email UNIQUE (email)
);

-- UTENTE e ADMIN, creati dal seeder
CREATE TABLE ruoli (
    id   uuid                   NOT NULL,
    nome character varying(255) NOT NULL,
    CONSTRAINT pk_ruoli PRIMARY KEY (id),
    CONSTRAINT uk_ruoli_nome UNIQUE (nome)
);

CREATE TABLE ruoli_utenti (
    id        uuid NOT NULL,
    id_utente uuid NOT NULL,
    id_ruolo  uuid NOT NULL,
    CONSTRAINT pk_ruoli_utenti PRIMARY KEY (id),
    CONSTRAINT uk_ruoli_utenti_utente_ruolo UNIQUE (id_utente, id_ruolo),
    CONSTRAINT fk_ruoli_utenti_utente FOREIGN KEY (id_utente) REFERENCES utenti (id) ON DELETE CASCADE,
    CONSTRAINT fk_ruoli_utenti_ruolo FOREIGN KEY (id_ruolo) REFERENCES ruoli (id) ON DELETE CASCADE
);

-- espansioni (set) di pokemontcg.io, sincronizzate all'avvio e ogni notte
CREATE TABLE espansioni (
    id           character varying(255) NOT NULL,
    nome         character varying(255) NOT NULL,
    serie        character varying(255),
    data_uscita  date,
    totale_carte integer,
    logo_url     character varying(512),
    simbolo_url  character varying(512),
    importata    boolean                NOT NULL,
    CONSTRAINT pk_espansioni PRIMARY KEY (id)
);

-- catalogo: carte importate da pokemontcg.io (id_esterno) e oggetti creati a mano dall'admin
CREATE TABLE oggetti (
    id            uuid                        NOT NULL,
    nome          character varying(255)      NOT NULL,
    prezzo        numeric(8,2)                NOT NULL,
    created_at    timestamp(6) with time zone NOT NULL,
    immagine_url  character varying(512),
    id_esterno    character varying(255),
    espansione_id character varying(255),
    numero        character varying(255),
    CONSTRAINT pk_oggetti PRIMARY KEY (id),
    CONSTRAINT uk_oggetti_nome UNIQUE (nome),
    CONSTRAINT uk_oggetti_id_esterno UNIQUE (id_esterno),
    CONSTRAINT fk_oggetti_espansione FOREIGN KEY (espansione_id) REFERENCES espansioni (id)
);

-- numeri di Pokédex dei Pokémon raffigurati in ogni carta (indice per Pokémon)
CREATE TABLE oggetti_pokedex (
    oggetto_id     uuid    NOT NULL,
    numero_pokedex integer NOT NULL,
    CONSTRAINT pk_oggetti_pokedex PRIMARY KEY (numero_pokedex, oggetto_id),
    CONSTRAINT fk_oggetti_pokedex_oggetto FOREIGN KEY (oggetto_id) REFERENCES oggetti (id)
);

-- Pokémon di cui si sono già scaricate le carte, e quando (si riscaricano dopo 7 giorni)
CREATE TABLE pokemon_importati (
    numero       integer                     NOT NULL,
    importato_il timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_pokemon_importati PRIMARY KEY (numero)
);

-- blacklist dei token dopo il logout (la V2 la sposta sul jti)
CREATE TABLE token_revocati (
    id       uuid                        NOT NULL,
    token    character varying(512)      NOT NULL,
    scadenza timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_token_revocati PRIMARY KEY (id),
    CONSTRAINT uk_token_revocati_token UNIQUE (token)
);

CREATE TABLE utenti_oggetti_preferiti (
    id         uuid                        NOT NULL,
    id_utente  uuid                        NOT NULL,
    id_oggetto uuid                        NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_utenti_oggetti_preferiti PRIMARY KEY (id),
    CONSTRAINT uk_utenti_oggetti_preferiti_utente_oggetto UNIQUE (id_utente, id_oggetto),
    CONSTRAINT fk_utenti_oggetti_preferiti_utente FOREIGN KEY (id_utente) REFERENCES utenti (id) ON DELETE CASCADE,
    CONSTRAINT fk_utenti_oggetti_preferiti_oggetto FOREIGN KEY (id_oggetto) REFERENCES oggetti (id) ON DELETE CASCADE
);

-- album di carte di un utente; motivo: decorazione della copertina (enum MotivoBinder)
CREATE TABLE binder (
    id                     uuid                        NOT NULL,
    id_utente              uuid                        NOT NULL,
    nome                   character varying(40)       NOT NULL,
    tasche                 integer                     NOT NULL,
    pagine                 integer                     NOT NULL,
    colore                 character varying(7)        NOT NULL,
    motivo                 character varying(20)       NOT NULL,
    id_carta_copertina     uuid,
    immagine_aggiornata_il timestamp(6) with time zone,
    created_at             timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_binder PRIMARY KEY (id),
    CONSTRAINT ck_binder_motivo CHECK (motivo IN ('NESSUNO', 'STELLE', 'FULMINI', 'POKEBALL', 'POIS', 'OLOGRAFICO')),
    CONSTRAINT fk_binder_utente FOREIGN KEY (id_utente) REFERENCES utenti (id) ON DELETE CASCADE,
    -- carta tolta dal catalogo: la finestrella della copertina si svuota
    CONSTRAINT fk_binder_carta_copertina FOREIGN KEY (id_carta_copertina) REFERENCES oggetti (id) ON DELETE SET NULL
);

-- tasche occupate; quelle vuote non hanno una riga
CREATE TABLE binder_slot (
    id         uuid    NOT NULL,
    id_binder  uuid    NOT NULL,
    pagina     integer NOT NULL,
    posizione  integer NOT NULL,
    id_oggetto uuid    NOT NULL,
    CONSTRAINT pk_binder_slot PRIMARY KEY (id),
    CONSTRAINT uk_binder_slot_posizione UNIQUE (id_binder, pagina, posizione),
    CONSTRAINT fk_binder_slot_binder FOREIGN KEY (id_binder) REFERENCES binder (id) ON DELETE CASCADE,
    CONSTRAINT fk_binder_slot_oggetto FOREIGN KEY (id_oggetto) REFERENCES oggetti (id) ON DELETE CASCADE
);

-- immagine di copertina caricata dall'utente, con lo stesso id del binder
CREATE TABLE binder_immagini (
    id_binder    uuid                  NOT NULL,
    contenuto    bytea                 NOT NULL,
    content_type character varying(20) NOT NULL,
    CONSTRAINT pk_binder_immagini PRIMARY KEY (id_binder),
    CONSTRAINT fk_binder_immagini_binder FOREIGN KEY (id_binder) REFERENCES binder (id) ON DELETE CASCADE
);
