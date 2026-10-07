# Impostor – pass-and-play word game (v1)

## Context
Empty repo. Build a web game where players sit together and pass one device around. Each player privately reveals either the secret word, or, if they are the impostor, a clue to it. After the reveal the device is put down and the players discuss off-screen while the impostor tries to blend in. The app handles setup, the private reveal, and a final step where the group picks who they think the impostor is and the app shows whether they were right. There is no scoring in v1.

Stack (chosen by user): React frontend, Python FastAPI backend, MariaDB storing a **Swedish** word/clue list.

## Assumptions (defaults picked, easy to change)
- The frontend uses Vite + React + TypeScript. There is no router; game phases are handled with component state.
- The game state lives only in the frontend, since everything happens on one device. The backend's only job is to serve a random word and clue from the DB. This keeps it simple, with no session tables.
- Exactly one impostor per game.
- A docker-compose file runs MariaDB locally. The backend and frontend run natively in dev.
- The UI language is Swedish, to match the word list.

## Layout
```
docker-compose.yml          # mariadb:11 service, volume, init SQL mounted
db/init/01_schema.sql       # categories + words tables
db/init/02_seed.sql         # ~60 Swedish word/clue pairs across categories
backend/
  pyproject.toml / requirements.txt   # fastapi, uvicorn, sqlalchemy, pymysql, pydantic-settings, pytest, httpx
  app/main.py               # FastAPI app, CORS for Vite dev origin
  app/db.py                 # engine/session from DATABASE_URL env
  app/models.py             # SQLAlchemy Category, Word
  app/routes.py             # endpoints below
  tests/test_routes.py      # uses SQLite in-memory override of get_db
frontend/
  (Vite React TS scaffold)
  src/api.ts                # fetchCategories(), fetchRandomWord(categoryIds)
  src/App.tsx               # phase state machine
  src/components/Setup.tsx      # first screen: add/remove/name players (min 3), multi-select categories, start button
  src/components/Reveal.tsx     # "Pass to X" → tap to reveal → hide → next
  src/components/Play.tsx       # single "Avslöja impostorn" button, no turn handling
  src/components/Vote.tsx       # pick the suspected impostor from the player list
  src/components/End.tsx        # right/wrong, real impostor + word + clue, "Play again" (same players)
  src/game.ts               # pure logic: pickImpostor, pickStartingPlayer, validateSetup
  src/game.test.ts          # vitest for pure logic
```

## Database schema
- `categories(id PK, name VARCHAR UNIQUE)`, for example Djur, Mat, Platser, Yrken, Sport, Saker.
- `words(id PK, word VARCHAR, clue VARCHAR, category_id FK)`. Example rows: `Elefant` with clue `Snabel`, and `Pizza` with clue `Italien`.

## API
- `GET /api/categories` returns `[{id, name}]`.
- `GET /api/words/random?category_id=1&category_id=3` returns `{word, clue, category}`. `category_id` is a repeatable query param (`list[int]`). The endpoint picks a random row from those categories with `ORDER BY RAND() LIMIT 1`. If the param is omitted, it picks from all categories. It returns 404 if no word matches.

## Game flow (frontend)
1. **Setup** (first screen, shown on load):
   - **Players**: starts with 3 empty name fields. "Lägg till spelare" adds a field, and each field has a remove button (hidden when only 3 are left). Names are trimmed and must be non-empty and unique.
   - **Categories**: categories are fetched from `/api/categories` and shown as toggleable chips or checkboxes, so several can be selected. A "Välj alla" / "Avmarkera alla" toggle sits above them. All categories are selected by default.
   - **"Starta spelet"** (the Swedish label for "start game") is disabled until there are at least 3 valid, unique names and at least 1 category. A short hint explains what's missing.
2. **Start**: clicking "Starta spelet" fetches a random word from the selected categories, picks one impostor at random and one random starting player (any player, including the impostor), then goes to Reveal.
3. **Reveal** (the only time the device is passed around): for each player in setup order, show "Ge enheten till {namn}". Tapping shows "Ordet: X", or for the impostor "Du är impostorn! Ledtråd: Y". Then "Dölj och skicka vidare". After the last player, go to Play.
4. **Play**: the device stays on the table. The screen shows "{namn} börjar!" for the random starting player, a short instruction to discuss, and one button, "Avslöja impostorn". There are no turns or rounds after that.
5. **Vote**: tapping "Avslöja impostorn" opens this screen. The impostor is not shown yet. It lists all players in the game. The group taps the player they think is the impostor, then confirms with "Bekräfta".
6. **End**: the impostor is shown only here, after a pick has been confirmed. It shows whether the guess was right ("Rätt!" or "Fel!"), who the real impostor was, and the word and clue. "Spela igen" goes back to Setup with the same players and categories filled in.

## Delegation
- **fastapi-developer** agent: `docker-compose.yml`, `db/init/*`, `backend/` (models, routes, tests).
- **react-specialist** agent: `frontend/` (scaffold, `api.ts`, `game.ts` + tests, components).
- The API contract above is the interface between them, so both can run in parallel. I review and run the verification steps after.

## Verification
1. Run `docker compose up -d`, then check that the seeded rows exist with `docker compose exec db mariadb ... -e "select count(*) from words"`.
2. Run `cd backend && uvicorn app.main:app --reload`, then `curl localhost:8000/api/words/random`. It should return Swedish JSON.
3. Run `pytest` in backend for the routes. Cover filtering by multiple `category_id`s (the result is always within them), omitting the param, and the 404 case.
4. Run `npm test` (vitest) in frontend: exactly one impostor is picked, the starting player is one of the players, and the setup validation (min 3, unique names, at least 1 category) works.
5. Run `npm run dev` and play through a 3-player game in the browser: the impostor sees only the clue. After the reveal, Play shows a starting player and the "Avslöja impostorn" button. Vote never shows the impostor. Voting for the right player and for a wrong one both show the correct result, impostor and word.
