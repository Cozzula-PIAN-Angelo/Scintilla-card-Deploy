-- Artista della carta da pokemontcg.io (campo artist, grezzo: può contenere coautori, es. "Shinji Higuchi + Sachiko Eba"),
-- per la sezione Artisti. La pagina di un artista cerca le sue carte per grafia esatta.

ALTER TABLE oggetti ADD COLUMN artista varchar(200);
-- null = non ancora letto da pokemontcg.io; '' = pokemontcg.io non lo indica
CREATE INDEX ix_oggetti_artista ON oggetti (artista);

-- artisti di cui si sono già scaricate le carte da pokemontcg.io, e quando (gemella di pokemon_importati)
CREATE TABLE artisti_importati (
    slug         varchar(100)                NOT NULL,
    importato_il timestamp(6) with time zone NOT NULL,
    CONSTRAINT pk_artisti_importati PRIMARY KEY (slug)
);
