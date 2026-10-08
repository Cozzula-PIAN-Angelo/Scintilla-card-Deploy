# Scintilla - vetrina di carte collezionabili

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
fe/
  src/app/api.ts            base delle chiamate, da VITE_API_URL
  .env.example
```
