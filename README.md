# CeloManca - il binder delle tue carte collezionabili

Backend REST (Spring Boot + JWT) e frontend React per sfogliare carte Pokémon,
salvarle tra i preferiti e, come admin, importarle dall'API Pokémon TCG.
Avviabile in locale e pronto per il deploy su Render.

| Parte | Tecnologia | In locale | Su Render |
|---|---|---|---|
| Backend | Spring Boot 3.5, Java 21, Maven wrapper | `be` sulla 3001 | Web Service (Docker) |
| Frontend | React 19, Vite, TypeScript, Tailwind 4, Redux Toolkit | `fe` sulla 5173 | Static Site |
| Database | PostgreSQL | locale sulla 5432 | Render PostgreSQL |

## Avvio in locale

1. PostgreSQL sulla 5432 e database creato:
   ```
   createdb -U postgres naso-commers
   ```
   Credenziali diverse da `postgres` / `1234`: variabili `DB_URL`, `DB_USERNAME`,
   `DB_PASSWORD` (vedi `be/env.example`).
2. Doppio clic su `avvia.cmd`, oppure:
   ```
   cd be && .\mvnw.cmd spring-boot:run
   cd fe && npm install && npm run dev
   ```
   Serve un JDK 21 o superiore in `JAVA_HOME`.
3. http://localhost:5173 - admin di sviluppo: `admin@ecommerce.local` / `admin1234`.

Non serve impostare variabili: senza `SPRING_PROFILES_ACTIVE` parte il profilo
`local` (`application-local.properties`) con secret JWT e password admin di sviluppo.

### Schema del database (Flyway)

Le tabelle le crea Flyway al primo avvio, con le migrazioni in `be/src/main/resources/db/migration`
(`V1__schema_iniziale.sql`, `V2__...`). Hibernate non modifica mai lo schema (`ddl-auto=validate`):
all'avvio controlla che tabelle e colonne delle entity esistano con tipi compatibili, e altrimenti l'app
non parte. Non controlla vincoli (NOT NULL, UNIQUE, foreign key, ON DELETE) né indici: quelli li verifica
`MigrazioniTest`. Una modifica allo schema è sempre una nuova migrazione `V<n>__descrizione.sql`, mai la
modifica di una già applicata (Flyway ne controlla il checksum e rifiuterebbe i database già migrati).

Un database creato prima di Flyway (tabelle senza `flyway_schema_history`) fa fermare l'avvio con
`Found non-empty schema(s) "public" but no schema history table`. Si resetta una volta, perdendo i dati:
```
psql -U postgres -d naso-commers -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```
Al riavvio Flyway ricrea le tabelle e i seeder ruoli, admin, espansioni e il set `base1`.

I test delle migrazioni (`MigrazioniTest`) girano su un PostgreSQL vero scaricato da Maven
(embedded-postgres): non servono Docker né un database di test.

## Vetrina ed espansioni

La vetrina mostra tutte le espansioni di pokemontcg.io (circa 180), raggruppate per
serie e con un campo di ricerca. Cliccando il logo di un'espansione si aprono le sue carte.

- **Elenco espansioni**: si sincronizza all'avvio e ogni notte (`GET /espansioni`, pubblico).
- **Carte di un'espansione** (`GET /espansioni/{id}/carte`, pubblico): alla prima apertura
  il backend importa il set nel catalogo (qualche secondo), dalle volte successive legge
  dal database. Prezzi, preferiti e modifica admin funzionano su tutte le carte.
- **Import a mano** (admin): `POST /carte/importa-set/{setId}` importa un set intero e
  completa le carte mancanti di un set già importato. Risponde con `trovate`,
  `importate`, `saltate` (già nel catalogo), `scartate` (prezzo oltre il massimo) e
  `rinominate`: carte il cui nome composto era già usato, importate con l'id di pokemontcg.io
  tra parentesi quadre invece di essere scartate.
- **Limite sugli import pubblici**: le prime aperture di set e Pokémon scaricano da pokemontcg.io,
  quindi sono limitate a `IMPORT_LIMITE_CLIENT` (default 30) all'ora per indirizzo IP e a
  `IMPORT_LIMITE_GIORNALIERO` (default 400) al giorno per tutto il sito; oltre, `429`. Quello che è
  già nel catalogo si consulta senza limiti, e gli import dell'admin non contano.
- **Primo avvio**: se il catalogo è vuoto si importano i set di `SEED_SET` (default `base1`),
  così l'hero ha subito delle carte.
- Le carte senza prezzo Cardmarket (tipico dei set appena usciti) entrano a 1,00 €.
- pokemontcg.io risponde spesso 500/502 a caso: le chiamate ritentano da sole fino a 6
  volte. `POKEMONTCG_API_KEY` (gratuita su dev.pokemontcg.io) alza il limite di richieste
  da circa 1.000 a 20.000 al giorno, ma non elimina quegli errori.

## Pokédex

La voce **Pokédex** della navbar mostra i 1025 Pokémon per generazione, con gli sprite in pixel
art di PokeAPI e una ricerca per nome (italiano o inglese) o numero. Cliccando un Pokémon si
aprono tutte le carte in cui compare, dalla più recente.

- `GET /pokedex/{numero}/carte` (pubblico): alla prima apertura il backend importa da
  pokemontcg.io tutte le carte del Pokémon (`nationalPokedexNumbers`), poi legge dal database;
  dopo 7 giorni le riscarica, così compaiono le carte dei set nuovi. Il numero massimo è
  `POKEDEX_NUMERO_MASSIMO` (default 1025); se il limite sugli import è raggiunto, il
  riaggiornamento settimanale si rinvia e si mostrano le carte già scaricate.
- Ogni carta salva i numeri di Pokédex dei Pokémon raffigurati (tabella `oggetti_pokedex`).
- L'elenco dei nomi è in `fe/src/features/pokedex/pokedex.json`, generato da PokeAPI.

### Collezione e varianti

Da loggati si segna quali carte si possiedono, in quante copie e in quale variante (Normale,
Reverse holo, 1a edizione; la stampa holo di una rara holo conta come Normale). Nelle pagine di un set e di un Pokémon le
carte non possedute sono in grigio, c'è il contatore «X / N carte», il filtro Tutte, Possedute,
Mancanti. Nel binder
le mancanti si possono mostrare in grigio (impostazione del binder) e il menu della tasca ha «Ce l'ho».

- `GET /me/collezione?espansione=` o `?pokemon=` restituisce le copie possedute; `PATCH /me/collezione`
  (`oggettoId`, `variante`, `delta`) le aggiunge o le toglie. Solo per utenti autenticati.
- Le varianti di una carta si leggono dai prezzi TCGplayer di pokemontcg.io e si salvano insieme
  alla carta: decidono l'effetto holo e la variante registrata dal «+». Per i set già importati
  prima di questa funzione le riempie il job orario, **5 set per giro e solo mentre il backend è
  sveglio** (su Render gratuito si addormenta): finché un set non è stato riempito non ha l'effetto
  holo e il «+» registra «Normale». Le carte create a mano non hanno varianti suggerite.

## Deploy su Render

1. Repository Git con `be/`, `fe/`, `render.yaml` nella radice.
2. **New > Blueprint**, si sceglie la repo: nascono `scintilla-db`, `scintilla-be`,
   `scintilla-fe`. `JWT_SECRET` lo genera Render, `SPRING_PROFILES_ACTIVE=prod`
   esclude i valori di sviluppo.
3. Variabili `sync: false` da impostare (URL senza `/` finale):

   | Servizio | Variabile | Valore |
   |---|---|---|
   | `scintilla-be` | `ADMIN_PASSWORD` | password dell'admin (obbligatoria) |
   | `scintilla-be` | `ADMIN_EMAIL` | email dell'admin |
   | `scintilla-be` | `ALLOWED_ORIGIN` | `https://scintilla-fe.onrender.com` |
   | `scintilla-be` | `POKEMONTCG_API_KEY` | facoltativa, può restare vuota |
   | `scintilla-fe` | `VITE_API_URL` | `https://scintilla-be.onrender.com` |

4. **Manual Deploy** di entrambi (`VITE_API_URL` è letta in fase di build).

### Svuotare il database di Render

I deploy normali non richiedono nulla: all'avvio Flyway applica da solo le migrazioni nuove. Anche un
database nuovo e vuoto (es. ricreato dal blueprint) si riempie al primo avvio del backend.

Per ripartire da zero sullo stesso database (i dati si perdono):

1. pannello di Render > `scintilla-db` > **Connect** > **External Connection**: copiare il comando `PSQL Command`;
2. eseguirlo nel terminale (serve `psql`, es. `C:\Program Files\PostgreSQL\18\bin\psql.exe`), poi:
   ```
   DROP SCHEMA public CASCADE; CREATE SCHEMA public;
   ```
3. `scintilla-be` > **Manual Deploy** > **Deploy latest commit**: Flyway ricrea le tabelle e i seeder
   ripopolano.

Non serve sospendere il backend: la versione online usa Flyway, quindi se una visita la risveglia tra
il passo 2 e il 3 crea anche lei le tabelle dalle migrazioni.

Se il deploy fallisce con `non-empty schema ... no schema history table`, nel database ci sono tabelle
senza la storia di Flyway, create da una versione del backend precedente a Flyway (`ddl-auto=update`):
Render tiene online la versione precedente. Si rifà il reset, ma con quella versione online l'ordine
conta: prima la si risveglia (`https://scintilla-be.onrender.com/actuator/health`), così è già avviata
e non ricrea le tabelle dopo il reset (`ddl-auto` agisce solo all'avvio); poi il `DROP SCHEMA` e subito
il **Manual Deploy**, senza aprire il sito finché non è finito.
Sospenderla non basta: **Resume Web Service** riavvia la stessa versione vecchia, che ricrea le tabelle.

### Database nuovo dal Blueprint con i dati di prima

Il database gratuito di Render scade 30 giorni dopo la creazione (poi 14 giorni di tolleranza, poi viene
cancellato). Per ripartire da un database nuovo senza perdere i dati:

1. **Prima della scadenza**, esportare i dati: in un file di testo (fuori dal repo) si mette solo
   l'**External Database URL** di `scintilla-db` (Connect > External Connection), poi
   ```
   powershell -ExecutionPolicy Bypass -File scripts\esporta-dati.ps1 -FileUrl C:\percorso\render-url.txt
   ```
   Nasce `dati-iniziali.b64` (base64 di gzip di un JSON con le righe di ogni tabella). Contiene email e
   hash delle password: non va in git (è nel `.gitignore`).
2. `scintilla-be` > **Environment** > **Secret Files**: aggiungere `dati-iniziali.b64` con il contenuto
   del file. Render ne accetta al massimo 1 MB in tutto: lo script avvisa sopra 900 kB e si ferma oltre.
3. Cancellare il vecchio `scintilla-db` (un solo database gratuito per volta), poi **Blueprint** >
   **Manual Sync**: nasce un `scintilla-db` vuoto, collegato da solo al backend.
4. `scintilla-be` > **Manual Deploy**. Al primo avvio Flyway crea le tabelle e `DatiInizialiSeeder`, visto
   il database vuoto, lo riempie: nel log `Dati iniziali: inserite {...}`. Dopo, gli altri seeder trovano
   admin e catalogo e saltano.

Il seeder non fa nulla se il file non c'è (in locale, `app.seed.dati` / `SEED_DATI`) o se nel database ci
sono già utenti o carte. Le colonne aggiunte dopo l'export prendono il loro valore di default. Se il file
c'è ma l'import fallisce, annulla tutto e **ferma l'avvio** (il deploy risulta fallito, nel log
`Dati iniziali: import ... non riuscito`): così gli altri seeder non riempiono il database al posto dei dati
veri. Si corregge il file, oppure lo si toglie dai Secret File per partire senza dati. Limiti:
- le password sono quelle del database di origine: l'admin entra con la password che aveva lì;
- una migrazione che aggiunge una colonna obbligatoria **senza** default richiede di riesportare il file.

## Struttura

```
render.yaml                 blueprint: database + backend + frontend
avvia.cmd                   avvio locale
be/
  Dockerfile                usato solo da Render
  env.example               variabili d'ambiente disponibili
  src/main/java/com/example/ecommerce/
    config/DatabaseUrl.java   DATABASE_URL di Render -> formato JDBC
    security/SecurityConfig   JWT, CORS da ALLOWED_ORIGIN, /actuator/health pubblico
    controllers, services, repositories, entities, payloads, exceptions, runners
  src/main/resources/
    application.properties        configurazione comune (variabili d'ambiente)
    application-local.properties  valori di sviluppo, profilo di default
    db/migration/                 migrazioni Flyway dello schema (V1, V2, ...)
fe/
  src/app/api.ts            base delle chiamate, da VITE_API_URL
  .env.example
```
