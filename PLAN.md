# Impostor – pass-and-play word game (v1)

## Context
Empty repo. Build a web game where players sit together and pass one device around. Each player privately reveals either the secret word, or, if they are the impostor, a clue to it. After the reveal the device is put down and the players discuss off-screen while the impostor tries to blend in. The app handles setup, the private reveal, and a final step where the group picks who they think the impostor is and the app shows whether they were right. A game consists of one or more rounds, and points are tracked across rounds.

Players can optionally **register** an account (name + password) on their own phone. A registered player has an avatar and saved stats, and joins a game by showing a QR code that the game device scans. Guests can still join by typing a name, and both kinds of player can be in the same game.

Stack (chosen by user): React frontend, Python FastAPI backend, MariaDB storing a **Swedish** word/clue list plus player accounts and game results.

## Assumptions (defaults picked, easy to change)
- The frontend uses Vite + React + TypeScript. There is no router. Game phases are handled with component state, and a top-level `view` state switches between the game (`'game'`) and the account pages (`'account'`).
- The game itself still runs only on the **game device**. The backend serves words, handles accounts, issues and redeems QR join tokens, and stores finished-game results. There are no live/multiplayer sessions. A registered player's phone is only used to log in and show a QR code.
- The game device does not need to be logged in. Anyone can host a game.
- Exactly one impostor per round. A new impostor, word and starting player are picked at random each round, so the same player can be impostor twice in a row.
- Scores for the game in progress live in frontend state and are lost on page reload. When the players finish with "Avsluta", the results for **registered** players are saved to the DB. Guests' results are not saved.
- Words may repeat between rounds. There is no "already used" tracking.
- A docker-compose file runs MariaDB locally. The backend and frontend run natively in dev.
- The UI language is Swedish, to match the word list.
- **Camera access needs HTTPS** on phones. In dev, Vite runs with `@vitejs/plugin-basic-ssl` and `--host`, and proxies `/api` to `localhost:8000`, so phones on the LAN can reach both over one HTTPS origin (no mixed content, no CORS on the LAN).

## Layout
```
docker-compose.yml          # mariadb:11 service, volume, init SQL mounted
db/init/01_schema.sql       # categories, words, players, games, game_players
db/init/02_seed.sql         # ~60 Swedish word/clue pairs across categories
backend/
  pyproject.toml / requirements.txt   # fastapi, uvicorn, sqlalchemy, pymysql, pydantic-settings, pwdlib[argon2], pyjwt, pytest, httpx
  app/main.py               # FastAPI app, CORS for Vite dev origin
  app/config.py             # settings: DATABASE_URL, SECRET_KEY, token lifetimes
  app/db.py                 # engine/session from DATABASE_URL env
  app/models.py             # SQLAlchemy Category, Word, Player, Game, GamePlayer
  app/security.py           # password hashing, create/verify tokens (auth, join, participant)
  app/deps.py               # get_db, get_current_player (Bearer auth token)
  app/routes/words.py       # categories + random word
  app/routes/auth.py        # register, login, me, update avatar
  app/routes/join.py        # issue + redeem QR join tokens
  app/routes/games.py       # save finished game, player stats
  tests/                    # SQLite in-memory override of get_db; one file per router
frontend/
  (Vite React TS scaffold, vite.config.ts with basic-ssl + /api proxy)
  src/api.ts                # all fetch calls, attaches the Bearer token when logged in
  src/auth.ts               # token in localStorage, useAuth() hook
  src/App.tsx               # view switch (game/account) + game phase state machine
  src/components/Setup.tsx      # guests by name + registered players by QR, categories, start button
  src/components/QrScanner.tsx  # camera modal, decodes QR, redeems the join token
  src/components/Reveal.tsx     # "Pass to X" → tap to reveal → hide → next
  src/components/Play.tsx       # single "Avslöja bedragaren" button, no turn handling
  src/components/Vote.tsx       # pick the suspected impostor from the player list
  src/components/End.tsx        # round result: right/wrong, real impostor + word + clue, points this round, category row + "Ändra" sheet, "Nästa runda" / "Avsluta"
  src/components/CategoryPicker.tsx # chips + "Välj alla"/"Avmarkera alla", shared by Setup and the End sheet
  src/components/Scoreboard.tsx # final scores after "Avsluta", saves the result, "Nytt spel" (same players)
  src/components/account/Login.tsx     # login / register tabs
  src/components/account/Profile.tsx   # avatar picker, stats, "Visa min QR-kod"
  src/components/account/MyQr.tsx      # full-screen QR, auto-refreshes before expiry
  src/game.ts               # pure logic: pickImpostor, pickStartingPlayer, validateSetup, scoreRound, gameSummary
  src/game.test.ts          # vitest for pure logic
```
Frontend libraries: `qrcode.react` to show QR codes and `qr-scanner` to read them from the camera.

## Database schema
- `categories(id PK, name VARCHAR UNIQUE)`, for example Djur, Mat, Platser, Yrken, Sport, Saker.
- `words(id PK, word VARCHAR, clue VARCHAR, category_id FK)`. Example rows: `Elefant` with clue `Snabel`, and `Pizza` with clue `Italien`.
- `players(id PK, username VARCHAR(30) UNIQUE, password_hash, avatar_emoji VARCHAR(8), avatar_color CHAR(7), created_at)`.
  - Usernames are case-insensitive: they are stored as typed, and uniqueness is checked on the lowercased name.
  - Defaults: a random colour from the design palette and the emoji 🙂.
- `games(id PK, finished_at, rounds INT)`.
- `game_players(game_id FK, player_id FK, points INT, impostor_rounds INT, won BOOL, PK(game_id, player_id))`. There is one row per registered player in a saved game.

Stats are computed with an aggregate query over `game_players`, not stored as counters.

## API
Words (unchanged):
- `GET /api/categories` returns `[{id, name}]`.
- `GET /api/words/random?category_id=1&category_id=3` returns `{word, clue, category}`.
  - `category_id` is a repeatable query param (`list[int]`).
  - The endpoint picks a random row from those categories with `ORDER BY RAND() LIMIT 1`. If the param is omitted, it picks from all categories.
  - It returns 404 if no word matches.

Accounts. Auth uses `Authorization: Bearer <auth token>`, a JWT valid for 30 days.
- `POST /api/auth/register` takes `{username, password}` and returns `{token, player}`.
  - The username is 2–30 characters, and the password is at least 6.
  - It returns 409 if the name is taken.
- `POST /api/auth/login` takes `{username, password}` and returns `{token, player}`, or 401.
- `GET /api/me` returns `{player, stats}`.
  - `player` is `{id, username, avatar_emoji, avatar_color}`.
  - `stats` is `{games, wins, total_points, impostor_rounds}`.
- `PATCH /api/me` takes `{avatar_emoji?, avatar_color?}` and returns the updated `player`.

QR join:
- `POST /api/join-tokens` requires auth and returns `{token, expires_at}`.
  - The token is a signed JWT (`purpose=join`, `sub=player_id`) that lives **2 minutes**, so a screenshot of the QR code can't be reused later.
  - The QR code encodes only this token string.
- `POST /api/join-tokens/redeem` takes `{token}`. It needs no auth and is called by the game device.
  - It returns `{player, participant_token}`. The participant token is a signed JWT (`purpose=participant`, `sub=player_id`) valid for **24 h**.
  - It returns 400 if the token is expired or invalid.

Games:
- `POST /api/games` needs no auth. It takes `{rounds, players: [{participant_token, points, impostor_rounds, won}]}` and returns 201 `{id}`.
  - Each participant token is checked. An invalid token or a duplicate player gives 400.
  - This means stats can only be saved for players who were really scanned into a game.
  - The scores themselves are trusted from the client, which is acceptable for a party game.

## Game flow (frontend)
0. **Account pages** (on a player's own phone): a profile button in the top bar opens them.
   - **Not logged in:** a "Logga in" / "Skapa konto" form.
   - **Logged in, Profile page:**
     - The avatar (emoji + colour) with a picker.
     - Stats cards: games, wins, points, and rounds as impostor.
     - A big **"Visa min QR-kod"** button. It shows the QR code full-screen with the name and avatar, and fetches a new join token about every 90 s.
     - "Logga ut".
1. **Setup** (first screen, shown on load):
   - **Players** is one list that holds two kinds of entry:
     - **Guest:** an editable name field.
     - **Registered:** a non-editable row showing the avatar and username, with a remove button.
   - The list starts with 3 empty guest fields. "Lägg till spelare" adds a guest field. **"Skanna QR"** opens the camera modal.
   - A successful scan **fills the first empty guest field** if there is one, otherwise it adds a new row. A short toast confirms it: "Anna tillagd".
   - Scanning a registered player who is already in the list shows "Redan med". An expired or invalid token shows "QR-koden har gått ut, be spelaren visa en ny". The camera stays open, so several players can be scanned in a row.
   - Remove buttons are hidden when only 3 entries are left. Names (guest names and usernames) are trimmed and must be non-empty and unique, case-insensitively.
   - **Categories**: categories are fetched from `/api/categories` and shown as toggleable chips or checkboxes, so several can be selected. A "Välj alla" / "Avmarkera alla" toggle sits above them. All categories are selected by default.
   - **"Starta spelet"** (the Swedish label for "start game") is disabled until there are at least 3 valid, unique names and at least 1 category. A short hint explains what's missing.
2. **Start**: clicking "Starta spelet" fetches a random word from the selected categories, picks one impostor at random and one random starting player (any player, including the impostor), then goes to Reveal.
3. **Reveal** (the only time the device is passed around): for each player in setup order, show "Ge enheten till {namn}". Tapping shows "Ordet: X", or for the impostor "Du är bedragaren! Ledtråd: Y". Then "Dölj och skicka vidare". After the last player, go to Play. Registered players are shown with their avatar.
4. **Play**: the device stays on the table. The screen shows "{namn} börjar!" for the random starting player, a short instruction to discuss, and one button, "Avslöja bedragaren". There are no turns or rounds after that.
5. **Vote**: tapping "Avslöja bedragaren" opens this screen. The impostor is not shown yet. It lists all players in the game. The group taps the player they think is the impostor, then confirms with "Bekräfta".
6. **End (round result)**: the impostor is shown only here, after a pick has been confirmed. This completes the round. It shows whether the guess was right ("Rätt!" or "Fel!"), who the real impostor was, the word and clue, and the points awarded this round. Then the players choose:
   - **Category row** (above the buttons): shows the current categories, for example "Kategorier: Djur · Mat · Sport", with an **"Ändra"** link. "Ändra" opens a bottom sheet with the same category chips and "Välj alla" toggle as Setup, pre-selected with the current categories. "Spara" applies the change and is disabled when no category is selected. "Avbryt" closes the sheet without changing anything.
   - **"Nästa runda"**: fetches a new random word from the current categories (the same as last round unless changed with "Ändra"), picks a new impostor and starting player, and goes straight to Reveal. Scores carry over. Players cannot be changed between rounds.
   - **"Avsluta"**: goes to Scoreboard.
7. **Scoreboard**: shows every player's total points, sorted highest first, plus the number of rounds played.
   - If any registered players took part, it calls `POST /api/games` once on mount with their results.
     - `won` is true for everyone tied for the highest total.
     - `impostor_rounds` is counted in App state.
   - A small line under the list shows the save status: "Statistik sparad för Anna, Erik" or "Kunde inte spara statistik – Försök igen".
   - "Nytt spel" goes back to Setup with the same players (guests and registered) and categories filled in, and all scores reset to 0.

## Scoring
Points are awarded once per round, when the vote is confirmed:
- **Correct guess** (the selected player is the impostor): every player except the impostor gets **1 p**. The impostor gets 0.
- **Wrong guess** (the selected player is not the impostor): the impostor gets **2 p**. Everyone else gets 0.

This is implemented as a pure function, `scoreRound(players, impostor, accused) -> Record<player, points>`. Its result is added to the running totals held in `App.tsx` state:
- `scores: Record<string, number>`
- `impostorRounds: Record<string, number>`
- `round: number`

`gameSummary(scores, impostorRounds, round)` builds the `POST /api/games` payload.

## Design
`design/preview.html` (the "Spelkväll" design) is the visual reference. Its tokens become `frontend/src/styles/tokens.css`, using plain CSS with variables. Before implementation, the preview gets these new frames:
- Login/register
- Profile with stats
- The full-screen QR code
- Setup with a scanned registered player
- The QR scanner modal

## Delegation
- **fastapi-developer** agent: `docker-compose.yml`, `db/init/*`, `backend/` (models, security, all routes, tests).
- **react-specialist** agent: `frontend/` (scaffold + vite config, `api.ts`, `auth.ts`, `game.ts` + tests, all components).
- The API contract above is the interface between them, so both can run in parallel. I review and run the verification steps after.

## Verification
1. Run `docker compose up -d`, then check that the seeded rows exist with `docker compose exec db mariadb ... -e "select count(*) from words"`.
2. Run `cd backend && uvicorn app.main:app --reload`, then `curl localhost:8000/api/words/random`. It should return Swedish JSON.
3. Run `pytest` in backend:
   - **Words:** filtering by multiple `category_id`s (the result is always within them), omitting the param, and the 404 case.
   - **Auth:** register, a duplicate (case-insensitive) gives 409, login with the right and wrong password, and `/api/me` with and without a token.
   - **Join:** issue then redeem returns the right player. An expired token (freeze time or use a 0 s lifetime) gives 400. An auth token used as a join token is rejected.
   - **Games:** saving with valid participant tokens updates `/api/me` stats. A forged or invalid participant token gives 400, and so does the same player twice.
4. Run `npm test` (vitest) in frontend:
   - Exactly one impostor is picked, and the starting player is one of the players.
   - The setup validation works: min 3, unique names (case-insensitive, guests and registered together), and at least 1 category.
   - `scoreRound` gives 1 p to each non-impostor and 0 to the impostor on a correct guess, and 2 p to the impostor only on a wrong guess.
   - `gameSummary` marks every tied leader as `won` and includes only registered players.
5. Run `npm run dev` and play through a 3-player game with guests only in the browser:
   - The impostor sees only the clue.
   - After the reveal, Play shows a starting player and the "Avslöja bedragaren" button.
   - Vote never shows the impostor.
   - Voting for the right player and for a wrong one both show the correct result, impostor and word.
   - Play 2–3 rounds with "Nästa runda" (one correct and one wrong guess), then "Avsluta". The scoreboard totals match the scoring rules.
   - On a round result, open "Ändra", pick a single category and press "Spara". The next round's word comes from that category. "Avbryt" leaves the categories unchanged, and "Spara" is disabled with nothing selected.
   - "Nytt spel" keeps the most recent category selection in Setup.
   - "Nytt spel" returns to Setup with the names kept and the scores reset.
6. QR flow (two devices, or a laptop as the game device and a phone over `https://<lan-ip>:5173`):
   - Register on the phone and open "Visa min QR-kod".
   - On the game device, choose "Skanna QR". The player appears with their avatar.
   - Scanning the same QR again shows "Redan med". A QR older than 2 minutes is rejected.
   - Finish a game. The profile stats on the phone update.
