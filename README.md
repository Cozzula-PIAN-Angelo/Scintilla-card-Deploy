# CeloManca - il binder delle tue carte collezionabili

Backend REST (Spring Boot + JWT) e frontend React per sfogliare carte Pokémon,
salvarle tra i preferiti e, come admin, importarle da [TCGdex](https://tcgdex.dev).
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

Non serve impostare variabili: `spring-boot:run` attiva il profilo `local`
(`application-local.properties`) con secret JWT e password admin di sviluppo. Il jar
(`java -jar`, Docker, Render) invece parte senza profili: senza `JWT_SECRET` e `ADMIN_PASSWORD`
non si avvia, così un deploy dimenticato non usa mai i valori di sviluppo. Avviando la classe
`EcommerceApplication` da un IDE va impostato il profilo `local` nella configurazione di avvio.

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

Le carte arrivano da [TCGdex](https://tcgdex.dev) (API gratuita, senza chiave), in inglese.
La vetrina mostra tutte le sue espansioni (circa 200, senza quelle di TCG Pocket), raggruppate per
serie e con un campo di ricerca. Cliccando il logo di un'espansione si aprono le sue carte.

- **Elenco espansioni**: si sincronizza all'avvio e ogni notte (`GET /espansioni`, pubblico).
- **Carte di un'espansione** (`GET /espansioni/{id}/carte`, pubblico): alla prima apertura
  il backend importa il set nel catalogo (qualche secondo), dalle volte successive legge
  dal database. Prezzi, preferiti e modifica admin funzionano su tutte le carte.
- **Import a mano** (admin): `POST /carte/importa-set/{setId}` importa un set intero e
  completa le carte mancanti di un set già importato. Risponde con `trovate`,
  `importate`, `saltate` (già nel catalogo), `scartate` (prezzo oltre il massimo) e
  `rinominate`: carte il cui nome composto era già usato, importate con l'id di TCGdex
  tra parentesi quadre invece di essere scartate.
- **Limite sugli import pubblici**: le prime aperture di set e Pokémon scaricano da TCGdex,
  quindi sono limitate a `IMPORT_LIMITE_CLIENT` (default 30) all'ora per indirizzo IP e a
  `IMPORT_LIMITE_GIORNALIERO` (default 400) al giorno per tutto il sito; oltre, `429`. Quello che è
  già nel catalogo si consulta senza limiti, e gli import dell'admin non contano.
- **Limite sui tentativi di login**: in 15 minuti al massimo `LOGIN_LIMITE_UTENZA` (default 10)
  tentativi falliti sulla stessa email o username, anche da IP diversi, e `LOGIN_LIMITE_IP`
  (default 30) dallo stesso indirizzo; oltre, `429` finché la finestra non scade. Il messaggio è
  lo stesso che l'account esista o no, e un login riuscito azzera i tentativi dell'utenza. Anche
  la durata della risposta è la stessa: per un'utenza inesistente BCrypt gira su un hash finto.
- **Limite sulle registrazioni rifiutate**: la registrazione dice se username o email sono già
  usati; per non permettere di controllare in fila molte email, dopo `REGISTRAZIONE_LIMITE_IP`
  (default 10) rifiuti di questo tipo dallo stesso IP in 15 minuti si risponde `429`.
- **Primo avvio**: se il catalogo è vuoto si importano i set di `SEED_SET` (default `base1`),
  così l'hero ha subito delle carte.
- Le carte senza prezzo Cardmarket (tipico dei set appena usciti) entrano a 1,00 €.
- Gli errori temporanei di TCGdex (5xx, 429, timeout) si ritentano da soli fino a 3 volte. Le carte
  di una pagina arrivano con un dettaglio per carta, 8 alla volta.
- **Passaggio da pokemontcg.io** (che si spegne il 1° marzo 2027): `be/src/main/resources/abbinamento-id.json`,
  generato una volta con `node scripts/genera-abbinamento.mjs`, dice per ogni set e carta l'id di TCGdex. La
  migrazione `V9__tcgdex` (Java) riscrive gli id nel database, e `DatiInizialiSeeder` fa lo stesso con un
  export fatto prima del passaggio.
- **Immagini che TCGdex non ha** (885 carte, i simboli di tutti i set, 30 loghi): copie in webp in
  `fe/public/immagini/` (circa 45 MB), fatte una volta con `node scripts/scarica-immagini.mjs` dai server di
  pokemontcg.io e Scrydex, che si spengono con la loro API. Lo script le converte con
  [sharp](https://sharp.pixelplumbing.com) (vedi «Script»). La migrazione `V10__immagini_locali` sostituisce nel
  database gli indirizzi di quei server con le copie; un'immagine già sparita diventa il segnaposto. Il sito non
  dipende più da pokemontcg.io in nessun punto.

## Pokédex

La voce **Pokédex** della navbar mostra i 1025 Pokémon per generazione, con gli sprite in pixel
art di PokeAPI e una ricerca per nome (italiano o inglese) o numero. Cliccando un Pokémon si
aprono tutte le carte in cui compare, dalla più recente.

- `GET /pokedex/{numero}/carte` (pubblico): alla prima apertura il backend importa da
  TCGdex tutte le carte del Pokémon (`dexId`), poi legge dal database;
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
- Le varianti di una carta si leggono da TCGdex (`variants`) e si salvano insieme alla carta:
  decidono l'effetto holo, la variante registrata dal «+» e le voci del master set. Le carte ancora
  da leggere le riempie il job orario: al primo giro dopo l'avvio tutti i set, poi **5 set per giro e
  solo mentre il backend è sveglio** (su Render gratuito si addormenta). Finché un set non è stato
  riempito non ha l'effetto holo e il «+» registra «Normale». Le carte create a mano non hanno
  varianti suggerite.

## Profilo

Dal menu account si aprono **Profilo** e **Impostazioni**. Il profilo è privato per ora, ma è già nella
forma di una futura pagina pubblica: non contiene mai l'email.

- `GET /me/profilo`: username, data di registrazione, immagine profilo, bio, colore, squadra (fino a 6
  Pokémon, il primo è il compagno), vetrina (fino a 6 carte, separate dai preferiti col cuore), binder
  in evidenza (fino a 3) e i numeri della collezione.
- `PATCH /me/profilo` (`bio`, `colore`); `PATCH /me/profilo/vetrina` e `/binder` (`ids`),
  `PATCH /me/profilo/squadra` (`numeri`): le liste arrivano intere e ordinate e sostituiscono quelle
  salvate (PATCH e non PUT: il CORS non ammette PUT).
- `POST` e `DELETE /me/profilo/avatar`: immagine già ritagliata quadrata e compressa dal browser,
  JPEG, PNG o WebP fino a 1 MB. `GET /avatar/{idUtente}?v=…` è pubblico, con cache lunga: la versione
  nell'URL cambia a ogni immagine nuova.
- `PATCH /me/account` (username, email) e `POST /me/password` chiedono la password attuale; una password
  sbagliata risponde 400 e conta nel limite dei tentativi di login. Il cambio password risponde con un
  token nuovo: i token emessi prima (gli altri dispositivi) non valgono più.
- Cancellando l'account spariscono immagine profilo e bio; squadra, vetrina, binder in evidenza e colore
  restano collegati all'id anonimo, per le statistiche.

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
   hash delle password: non va in git (è nel `.gitignore`). Dentro c'è solo quello che non si può
   riscaricare: utenti, collezioni, binder, preferiti, profili e le sole carte che usano. Il resto del catalogo si
   riscarica da TCGdex alla prima apertura delle pagine (i set escono non importati), così il file resta di
   pochi kB anche con migliaia di carte nel catalogo.
2. `scintilla-be` > **Environment** > **Secret Files**: aggiungere `dati-iniziali.b64` con il contenuto
   del file. Render accetta Secret File fino a **500 KiB** (oltre, il deploy fallisce con `secret ... too big`):
   lo script avvisa sopra 450 KiB e si ferma oltre.
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

## Script

Script Node in `scripts/`, lanciati a mano dalla radice del progetto. Le regole di ognuno sono funzioni pure
in un file `*-regole.mjs` con il suo test (`node --test scripts/<nome>-regole.test.mjs`).

| Script | Cosa fa | Quando |
|---|---|---|
| `genera-artisti.mjs` | `artisti.json` (elenco degli artisti) da tutte le carte di TCGdex | quando escono set nuovi |
| `genera-abbinamento.mjs` | `abbinamento-id.json`: id di pokemontcg.io -> TCGdex | una volta, già fatto (chiamava pokemontcg.io) |
| `scarica-immagini.mjs` | copie webp delle immagini che TCGdex non ha | una volta, già fatto (dopo `genera-abbinamento.mjs`) |
| `esporta-dati.ps1` | export del database per `DatiInizialiSeeder` | prima che scada il database di Render |

**sharp** (`fe/package.json`, solo `devDependencies`) serve soltanto a `scarica-immagini.mjs`: libreria Node per le
immagini (basata su libvips) che le legge, le ridimensiona (carte 450 px, loghi 400, simboli 96, mai ingrandite) e
le converte in WebP (qualità 75 per le carte, 90 per loghi e simboli), così una carta passa da circa 650 KB a
circa 48 KB. Non entra nella build del sito né nel browser; porta circa 30 MB di binari nativi in
`fe/node_modules`. Lo script la carica dal frontend (`createRequire` su `fe/package.json`), quindi prima serve
`npm install` in `fe/`. Se le copie restano definitive si può togliere con `npm uninstall sharp` in `fe/`.

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
    application-local.properties  valori di sviluppo, solo con spring-boot:run
    db/migration/                 migrazioni Flyway dello schema (V1, V2, ...)
fe/
  src/app/api.ts            base delle chiamate, da VITE_API_URL
  public/immagini/          copie webp delle immagini che TCGdex non ha (carte/, set/)
  .env.example
scripts/                    script Node e PowerShell (vedi «Script»)
```
