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
