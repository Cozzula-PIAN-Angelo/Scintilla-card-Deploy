# Progetto base - BE + FE (TSX) + PostgreSQL

Scheletro di partenza, pronto per il deploy su Render.

| Parte | Tecnologia | In locale | Su Render |
|---|---|---|---|
| Backend | Spring Boot 4.1.1, Java 25, Maven wrapper | `be` sulla 8080 | Web Service (Docker) |
| Frontend | React 19, Vite, TypeScript, Tailwind 4 | `fe` sulla 5173 | Static Site |
| Database | PostgreSQL | locale sulla 5432 | Render PostgreSQL |

## Endpoint

| Metodo | Percorso | Cosa fa |
|---|---|---|
| GET | `/api/stato` | nome del database collegato e ora del server |
| GET | `/actuator/health` | health check per Render |

## Avvio in locale

1. PostgreSQL sulla 5432 e database creato:
   ```
   createdb -U postgres progetto_base
   ```
   Credenziali diverse da `postgres` / `admin`: variabili `DB_URL`, `DB_USERNAME`,
   `DB_PASSWORD`, oppure `be/src/main/resources/application.yml`.
2. Doppio clic su `avvia.cmd`, oppure:
   ```
   cd be && .\mvnw.cmd spring-boot:run
   cd fe && npm install && npm run dev
   ```
3. http://localhost:5173 - il riquadro deve mostrare `progetto_base`.

## Deploy su Render

1. Repository Git con `be/`, `fe/`, `render.yaml` nella radice.
2. **New > Blueprint**, si sceglie la repo: nascono `app-db`, `app-be`, `app-fe`
   (rinominarli in `render.yaml` prima del primo deploy).
3. Dopo la prima build si impostano le due variabili `sync: false`, senza `/` finale:

   | Servizio | Variabile | Valore |
   |---|---|---|
   | `app-be` | `ALLOWED_ORIGIN` | `https://app-fe.onrender.com` |
   | `app-fe` | `VITE_API_URL` | `https://app-be.onrender.com` |

4. **Manual Deploy** di entrambi (`VITE_API_URL` e' letta in fase di build).

## Struttura

```
render.yaml                 blueprint: database + backend + frontend
avvia.cmd                   avvio locale
be/
  Dockerfile                usato solo da Render
  src/main/java/it/epicode/base/
    ProgettoBaseApplication.java
    config/DatabaseUrl.java   DATABASE_URL -> formato JDBC
    config/CorsConfig.java    origini da ALLOWED_ORIGIN
    web/StatoController.java  endpoint di prova
  src/main/resources/application.yml
fe/
  src/lib/api.ts            base delle fetch, da VITE_API_URL
  src/App.tsx               pagina di prova
  .env.example
```
