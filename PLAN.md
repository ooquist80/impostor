# Impostor – pass-and-play word game (v1)

## Context
The repo contains only planning files and the design mock-up (`design/preview.html`). Build a web game where players sit together and pass one device around. Each player privately reveals either the secret word, or, if they are the impostor, a clue to it. After the reveal the device is put down and the players discuss off-screen while the impostor tries to blend in. The app handles setup, the private reveal, and a final step where, once a majority of the players want to vote, every player in turn secretly votes for who they think the impostor is, and the app shows the result. A game consists of one or more rounds, and points are tracked across rounds.

Players can optionally **register** an account (email + name + password) on their own phone. A registered player has an avatar they can edit and saved stats, and joins a game by showing a QR code that the game device scans. Guests can still join by typing a name, and both kinds of player can be in the same game.

The game itself runs only on the **game device**. The backend serves words, handles accounts, issues and redeems QR join tokens, and stores finished-game results. There are no live/multiplayer sessions. A registered player's phone is only used to log in and show a QR code. The game device does not need to be logged in, so anyone can host a game.

Stack (chosen by user): React frontend (Vite + TypeScript), Python FastAPI backend, MariaDB storing a **Swedish** word/clue list plus player accounts and game results. The UI language is Swedish, to match the word list.

## Layout
One `docker-compose.yml` runs the whole app for hosting (see Hosting). In dev, only its `db` service is started, and the backend and frontend run natively.
```
docker-compose.yml          # db, backend, web services; all config from .env
.env.example                # every setting with comments; copied to .env (gitignored)
Makefile                    # `make start`, `make update`, `make backup` for the server (see Hosting)
backups/                    # gzipped DB dumps from `make backup` (gitignored)
README.md                   # short hosting guide (see Hosting)
backend/
  Dockerfile                # python:3.12-slim, installs requirements, copies app/ + alembic files, runs uvicorn on 0.0.0.0:8000
  requirements.txt          # fastapi, uvicorn, sqlalchemy, alembic, pymysql, pydantic-settings, pwdlib[argon2], pyjwt, pytest, httpx
  alembic.ini               # script_location = migrations; no URL here (env.py supplies it)
  migrations/env.py         # URL from app.config settings, target_metadata = app.models.Base.metadata
  migrations/versions/0001_initial_schema.py  # categories, words, players, games, game_players
  app/main.py               # FastAPI app (no CORS: the browser reaches it only through the Vite proxy or Caddy)
  app/seed.py               # `python -m app.seed` / `make import`: reads data/words.csv (category,word,clue), inserts missing categories and words
  data/words.csv            # the word list, gitignored and copied to servers by hand; data/words.example.csv shows the format
  app/config.py             # settings read from env and the root .env: MARIADB_*, DB_HOST, DB_PORT, SECRET_KEY, token lifetimes; builds the DB URL
  app/db.py                 # engine/session from the settings' DB URL
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
  Dockerfile                # stage 1 node:22-alpine runs `npm ci && npm run build`; stage 2 caddy:2-alpine serves dist/
  Caddyfile                 # HTTPS, serves the SPA, reverse_proxy /api/* to backend:8000
  CLAUDE.md                 # lasting design/code rules for this folder (see Design)
  src/styles/tokens.css     # copied from design/preview.html :root
  src/components/ui/        # Button, Card, Chip, Avatar, PlayerRow, ScoreRow, Badge, Toast, BottomSheet, Screen
  src/api.ts                # all fetch calls, attaches the Bearer token when logged in
  src/pwa.ts                # registers the service worker (vite-plugin-pwa); a new version is applied only from Setup
  public/icon.svg           # app icon source; `npm run icons` generates the PNGs/favicon next to it (committed)
  src/auth.ts               # token in localStorage, useAuth() hook
  src/App.tsx               # view switch (game/account) + game phase state machine
  src/components/Setup.tsx      # guests by name + registered players by QR, categories, "Regler" button, start button
  src/components/Rules.tsx      # game rules as text, opened from Setup in a BottomSheet
  src/components/QrScanner.tsx  # camera modal, decodes QR, redeems the join token
  src/components/Reveal.tsx     # "Pass to X" → tap to reveal → hide → next
  src/components/Play.tsx       # single "Avslöja bedragaren" button, no turn handling
  src/components/Vote.tsx       # anonymous vote in turns: "Ge enheten till X" → pick a suspect → hide → next
  src/components/End.tsx        # round result: right/wrong, real impostor + word + clue, vote tally, everyone's points this round and running total, category row + "Ändra" sheet, "Nästa runda" / "Avsluta"
  src/components/CategoryPicker.tsx # chips + "Välj alla"/"Avmarkera alla", shared by Setup and the End sheet
  src/components/Scoreboard.tsx # final scores after "Avsluta", saves the result, "Nytt spel" (same players)
  src/components/account/Login.tsx     # login / register tabs
  src/components/account/Profile.tsx   # name + email, "Ändra avatar", stats, "Visa min QR-kod"
  src/components/account/AvatarEditor.tsx # avatar editor in a BottomSheet: preview, Slumpa, eyes, mouth, colour, background
  src/avatar.ts             # DiceBear "Clay" rendering (on the device), editor choices, guest seeds
  src/components/account/MyQr.tsx      # full-screen QR, auto-refreshes before expiry
  src/game.ts               # pure logic: pickImpostor, pickStartingPlayer, validateSetup, tallyVotes, roundVerdict, scoreRound, gameSummary
  src/game.test.ts          # vitest for pure logic
```
Frontend libraries: `qrcode.react` to show QR codes and `qr-scanner` to read them from the camera.

The frontend has no router. Game phases are handled with component state, and a top-level `view` state switches between the game (`'game'`) and the account pages (`'account'`).

**Camera access needs HTTPS** on phones. In dev, Vite runs with `@vitejs/plugin-basic-ssl` and `--host`, and proxies `/api` to `localhost:8000`, so phones on the LAN reach both over one HTTPS origin (no mixed content, no CORS).

## Database schema
- `categories(id PK, name VARCHAR UNIQUE)`, for example Djur, Mat, Platser, Yrken, Sport, Saker.
- `words(id PK, word VARCHAR, clue VARCHAR, category_id FK)`. Example rows: `Elefant` with clue `Snabel`, and `Pizza` with clue `Italien`.
- `players(id PK, email VARCHAR(254) UNIQUE, name VARCHAR(30), password_hash, avatar JSON, created_at)`.
  - `email` is the login. It must be a well-formed address (pydantic `EmailStr`, no confirmation mail) and is stored lower-cased. It is shown only on the player's own profile, never in games or on the game device. Uniqueness is enforced in two places:
    - `register` checks for an existing `func.lower(email) == email.lower()` before inserting and returns 409. This also works on SQLite, so the tests cover it.
    - The `UNIQUE` index on `email` uses the case-insensitive collation, so it catches the race where two registrations pass the check at the same time. An `IntegrityError` on insert is also turned into 409.
  - `name` is the display name shown in games (trimmed, 2–30 characters). It is **not** unique: several accounts can be called "Anna". Within one game names must still differ (see Setup).
  - Migration `0002` replaced the old `username` column and wiped all existing accounts, games and stats.
  - `avatar` holds DiceBear "Clay" options: `{seed, body?, eyes?, mouth?, top?, pattern?, bodyColor?, backgroundColor?}`. A new player gets a random 16-hex seed and no picks; picks left unset are chosen from the seed. Validated by `schemas.Avatar` (the variant names of `@dicebear/styles` `clay.json`; `top` and `pattern` can also be `none`; colours `#RRGGBB`; unknown keys rejected). Migration `0003` replaced the old emoji + colour columns, seeding existing players from their id; `0004` (the switch from Thumbs to Clay) kept only the seed.
- `games(id PK, finished_at, rounds INT)`.
- `game_players(game_id FK, player_id FK, points INT, impostor_rounds INT, won BOOL, PK(game_id, player_id))`. There is one row per registered player in a saved game.

Stats are computed with an aggregate query over `game_players`, not stored as counters.

**Character set.** Words and player names contain å, ä and ö, and avatar seeds may contain emoji (4-byte UTF-8), so everything is `utf8mb4`:
- The `db` service starts MariaDB with `--character-set-server=utf8mb4 --collation-server=utf8mb4_uca1400_swedish_ai_ci`. The Swedish collation treats å, ä and ö as their own letters (so "Åsa" and "Asa" sort and compare as different names) and sorts them last, as in Swedish.
- Every table in the migrations sets `mariadb_charset="utf8mb4"` and `mariadb_collate="utf8mb4_uca1400_swedish_ai_ci"`, so the schema doesn't depend on server defaults.
- The DB URL that `config.py` builds ends in `?charset=utf8mb4`, so the connection itself doesn't mangle emoji.

## Migrations (Alembic)
Alembic owns the schema. There is no `db/init/` SQL; MariaDB starts with an empty database and `alembic upgrade head` builds it. Words are not in migrations (see Word list).
- `app/models.py` is the source of truth for the schema. A schema change is made by editing the models, then running `alembic revision --autogenerate -m "..."`, then reading and fixing the generated file before committing it. Autogenerate misses some changes, such as renames, and can't do data changes.
- **Word list.** The words live in `backend/data/words.csv` (header `category,word,clue`), which is gitignored so the list never reaches GitHub. `make import` (`docker compose run --rm backend python -m app.seed`) imports it; the backend never imports it on its own:
  - Add only: categories and words missing from the DB are inserted (a word matches on category + word, case-insensitive). Nothing is updated or removed.
  - A missing or malformed file makes the command exit non-zero with the file name or line number, and nothing is imported.
  - In Docker, `./backend/data` is bind-mounted read-only at `/app/data`. `WORDS_CSV` overrides the path. The file is copied to each server by hand, then `make import` loads it.
- Migrations **never import `app.models`**. A migration that touches data defines the tables and columns it touches inline with `sa.table("words", sa.column("word"), ...)`. The models change over time, but an old migration has to keep working against the schema as it was when it was written, for example on a fresh install that runs every migration from `0001`.
- Revision files get readable, ordered ids (`0001`, `0002`, …) via `--rev-id`.
- An applied migration is never edited. A fix goes in a new migration.
- Every migration has a working `downgrade()`. Rolling back is a manual step: `docker compose run --rm backend alembic downgrade -1`.
- **Caution:** MariaDB commits DDL immediately, so a migration that fails halfway can leave the schema partly changed and has to be fixed by hand. Keep each migration small, one change per file where practical.
- The tests keep using SQLite with `Base.metadata.create_all`. Verification checks separately that the migrations and models agree.

## API
Words:
- `GET /api/categories` returns `[{id, name}]`.
- `GET /api/words/random?category_id=1&category_id=3` returns `{word, clue, category}`.
  - `category_id` is a repeatable query param (`list[int]`).
  - The endpoint picks a random row from those categories. If the param is omitted, it picks from all categories.
  - The random pick must work on both MariaDB and the SQLite test DB (`RAND()` exists only in MariaDB). Use `func.random()` on SQLite and `func.rand()` on MariaDB, chosen from the session's dialect, or count the matching rows and fetch one at a random offset.
  - Words may repeat between rounds. There is no "already used" tracking.
  - It returns 404 if no word matches.

Accounts. Auth uses `Authorization: Bearer <auth token>`, a JWT valid for 30 days.
- `POST /api/auth/register` takes `{email, name, password}` and returns `{token, player}`.
  - The email must be valid, the name is 2–30 characters, and the password is at least 6 (422 otherwise).
  - It returns 409 if the email is already registered (case-insensitive).
- `POST /api/auth/login` takes `{email, password}` and returns `{token, player}`, or 401.
- `GET /api/me` returns `{player, email, stats}`. This is the only response that contains the email.
  - `player` is `{id, name, avatar}`, the same public shape everywhere (also from QR redeem). `avatar` only contains the picks that are set.
  - `stats` is `{games, wins, total_points, impostor_rounds}`.
- `PATCH /api/me` takes `{avatar}` (the whole avatar; picks left out go back to the seed's choice) and returns the updated `player`.

QR join:
- `POST /api/join-tokens` requires auth and returns `{token, expires_at}`.
  - The token is a signed JWT (`purpose=join`, `sub=player_id`) that lives **2 minutes**, so a screenshot of the QR code can't be reused later.
  - The QR code encodes only this token string.
- `POST /api/join-tokens/redeem` takes `{token}`. It needs no auth and is called by the game device.
  - It returns `{player, participant_token}`. The participant token is a signed JWT (`purpose=participant`, `sub=player_id`) valid for **24 h**.
  - It returns 400 if the token is expired or invalid.

Games:
- `POST /api/games` needs no auth. It takes `{rounds, players: [{participant_token, points, impostor_rounds, won}]}` and returns 201 `{id}`.
  - An empty `players` list gives 400. The frontend never sends one, because Scoreboard only calls this when registered players took part.
  - Each participant token is checked. An invalid token or a duplicate player gives 400.
  - This means stats can only be saved for players who were really scanned into a game.
  - The scores themselves are trusted from the client, which is acceptable for a party game.

## Game flow (frontend)
0. **Account pages** (on a player's own phone): a profile button in the top bar opens them.
   - **Not logged in:** a "Logga in" / "Skapa konto" form.
   - **Logged in, Profile page:**
     - The name, and the email below it (the only place the email is shown).
     - **"Ändra avatar"** opens the avatar editor in a `BottomSheet`: a live preview, "🎲 Slumpa" (new random seed, clears the picks), 9 eye styles, 5 mouths, body colour (the 5 avatar palette colours) and background (`--surface-2` or a palette colour), each shown as a small preview. "Spara" saves with `PATCH /api/me`; "Avbryt" or tapping outside discards the changes.
     - Stats cards: games, wins, points, and rounds as impostor.
     - A big **"Visa min QR-kod"** button. It shows the QR code full-screen with the name and avatar, and fetches a new join token about every 90 s.
     - "Logga ut".
1. **Setup** (first screen, shown on load):
   - **Players** is one list that holds two kinds of entry:
     - **Guest:** an editable name field.
     - **Registered:** a non-editable row showing the avatar and name, with a remove button. It remembers the account id.
   - The list starts with 3 empty guest fields. "Lägg till spelare" adds a guest field. **"Skanna QR"** opens the camera modal.
   - A successful scan **fills the first empty guest field** if there is one, otherwise it adds a new row. A short toast confirms it: "Anna tillagd".
   - Scanning a registered player who is already in the list shows "Redan med". An expired or invalid token shows "QR-koden har gått ut, be spelaren visa en ny". The camera stays open, so several players can be scanned in a row.
   - **Logged in on the game device:** the logged-in player is added automatically, once per login, like a scan (the app issues a join token and redeems it right away). A registered row can always be removed; at the 3-entry minimum it turns back into an empty guest field. While the logged-in player is not in the list, a **"+ Lägg till {namn}"** button adds them back.
   - Remove buttons on guest fields are hidden when only 3 entries are left. Names (guest names and account names) are trimmed and must be non-empty and unique within the game, case-insensitively.
   - Scanning (or adding yourself) is matched on account id: the same account again shows "Redan med". A different player whose name is already in the list is refused with "Någon heter redan {namn}. Byt namn på gästen och skanna igen".
   - **Categories**: categories are fetched from `/api/categories` and shown as toggleable chips or checkboxes, so several can be selected. A "Välj alla" / "Avmarkera alla" toggle sits above them. All categories are selected by default.
   - **"Starta spelet"** (the Swedish label for "start game") is disabled until there are at least 3 valid, unique names and at least 1 category. A short hint explains what's missing.
   - **"Regler"**: a small button in the top bar, next to the profile button (not the footer's main action, which stays "Starta spelet"), opens the rules in a `BottomSheet`, rendered by `Rules.tsx`. It is plain text with short headings, scrolls if it is taller than the screen, and closes with "Stäng" or by tapping outside (see `BottomSheet`). Closing it leaves the setup (players, categories) untouched. The text is in Swedish, in the same informal "du" tone, and covers:
     - The idea: everyone but one gets the secret word; the impostor only gets a clue and tries to blend in.
     - Setup: at least 3 players, guests by name or registered players by QR, and choosing categories.
     - Reveal: pass the device, look at your word or clue in secret, hide it and pass it on.
     - Discussion: the starting player begins; talk about the word without giving it away. When most of you want to vote, tap "Avslöja bedragaren".
     - Voting: everyone votes in turn and in secret, the impostor too; you can't vote for yourself.
     - Points: 1 p for each player who votes for the impostor, and 1 p to the impostor for every incorrect vote (see Scoring). Everyone's points for the round and running total are shown after each vote. Points add up over rounds, and the highest total wins.
     - Rounds: "Nästa runda" or "Avsluta", and that categories can be changed between rounds.

     The rules text is static in `Rules.tsx`. Any change to the game flow or Scoring must update it too.
2. **Start**: clicking "Starta spelet" fetches a random word from the selected categories, picks exactly one impostor at random and one random starting player (any player, including the impostor), then goes to Reveal. This is repeated for every round, so the same player can be impostor twice in a row.
3. **Reveal** (the device is passed around; it is passed again for the vote): for each player in setup order, show "Ge enheten till {namn}". Tapping shows "Ordet: X", or for the impostor "Du är bedragaren! Ledtråd: Y". Then "Dölj och skicka vidare". After the last player, go to Play. Every player is shown with their avatar.
4. **Play**: the device stays on the table. The screen shows "{namn} börjar!" for the random starting player, a short instruction to discuss and to vote when most of the group is ready, and one button, "Avslöja bedragaren". The app does not handle turns; the discussion happens off-screen. The group decides off-screen when a **majority** wants to vote, and then taps the button. The app does not count who wants to vote.
5. **Vote** (the device is passed around again): voting is **anonymous** and done **in turns**, in setup order, like Reveal. The impostor is not shown yet.
   - For each player: "Ge enheten till {namn}" → "Rösta" → the list of all **other** players (you can't vote for yourself) → pick one → "Bekräfta" → the "Rösten är lagd" screen (below). Until "Bekräfta", the player can change their pick.
   - **The impostor votes too**, on the same screen with the same texts, so nobody can tell who the impostor is from how the turns look. The impostor's vote is ignored in scoring and in the tally.
   - Nobody's vote is shown to the next player, and no running tally is shown during the vote.
   - Votes are held as `votes: Record<voter, accused>` in round state only. They are never sent to the backend, and who voted for whom is never shown.
   - **Who voted for whom is secret.** No points are shown during the vote. Once everyone has voted, End shows every player's points for the round and their running total, so it can be deduced who voted correctly; this is accepted.
   - After "Bekräfta" a "Rösten är lagd" screen tells the voter who to pass to, with "Dölj och skicka vidare". For the last voter it says everyone has voted and the button is "Visa resultatet", which goes to End.
6. **End (round result)**: the impostor is shown only here, after everyone has voted. This completes the round. It shows:
   - The headline: **"Rätt!"** if the impostor got strictly more votes than any other player, otherwise **"Fel!"** (this includes a tie for most votes). The headline is only the group's verdict; points don't depend on it.
   - Who the real impostor was, the word and the clue.
   - One list of all players, sorted by votes received (most first), each row showing only the number of votes they got. It shows counts only, not who voted for whom.
   - Every row has a badge with that player's points this round (`+0 p` when none) and the player's running total after this round. The impostor's row is marked 🕵️ and its badge is red; other players' badges are green, or grey for `+0 p`.
   - A hint in the list header: "Poäng · totalt".

   Then the players choose:
   - **Category row** (above the buttons): shows the current categories, for example "Kategorier: Djur · Mat · Sport", with an **"Ändra"** link. "Ändra" opens a bottom sheet with the same category chips and "Välj alla" toggle as Setup, pre-selected with the current categories. "Spara" applies the change and is disabled when no category is selected. "Avbryt", or tapping outside the sheet, closes it without changing anything.
   - **"Nästa runda"**: fetches a new random word from the current categories (the same as last round unless changed with "Ändra"), picks a new impostor and starting player, and goes straight to Reveal. Scores carry over. Players cannot be changed between rounds.
   - **"Avsluta"**: goes to Scoreboard.
7. **Scoreboard**: shows every player's total points, sorted highest first, plus the number of rounds played.
   - If any registered players took part, it calls `POST /api/games` once on mount with their results.
     - A `useRef` flag guards the call so it runs only once, even when React StrictMode mounts the component twice in dev. Without it the game would be saved twice and stats doubled. "Försök igen" bypasses the guard.
     - `won` is true for everyone tied for the highest total.
     - `impostor_rounds` is counted in App state.
   - A small line under the list shows the save status: "Statistik sparad för Anna, Erik" or "Kunde inte spara statistik – Försök igen".
   - "Nytt spel" goes back to Setup with the same players (guests and registered) and categories filled in, and all scores reset to 0.

## Scoring
Points are awarded once per round, after the last vote. Each vote by a player other than the impostor counts on its own:
- **Correct vote** (for the impostor): the voter gets **1 p**.
- **Incorrect vote** (for anyone else): the impostor gets **1 p**. The voter gets 0.
- The impostor's own vote gives no points to anyone.

So with 5 players, the impostor gets between 0 and 4 p per round.

This is implemented as pure functions:
- `tallyVotes(votes, impostor) -> Record<player, number>`, the number of votes each player got, ignoring the impostor's vote. `End` uses it for the vote list.
- `roundVerdict(tally, impostor) -> 'caught' | 'escaped'`. `'caught'` ("Rätt!") only if the impostor has strictly more votes than every other player; a tie for most votes, or the impostor having none, is `'escaped'` ("Fel!").
- `scoreRound(players, impostor, votes) -> Record<player, points>`.

The `scoreRound` result is added to the running totals held in `App.tsx` state:
- `players: Player[]`, where `Player` is `{name, kind: 'guest' | 'registered', participantToken?, avatar?}`. Registered players get `participantToken` and `avatar` from the redeem call. Guests have no `avatar`; theirs is drawn with their name as the seed.
- `scores: Record<string, number>`, keyed by player name (names are unique)
- `impostorRounds: Record<string, number>`
- `round: number`

`gameSummary(players, scores, impostorRounds, round)` builds the `POST /api/games` payload, taking each registered player's `participantToken` from `players`.

Scores for the game in progress live only in frontend state and are lost on page reload. When the players finish with "Avsluta", the results for **registered** players are saved to the DB. Guests' results are not saved.

## Design
`design/preview.html` (the "Spelkväll" design) is the **visual source of truth**. Open it and read its CSS and markup. Match it; don't reinterpret it.

**Tokens.** Copy the `:root` block (colours, fonts, radii, shadow) as is into `frontend/src/styles/tokens.css`. Add the avatar palette (`.a1`–`.a5` in the preview) to it as `--avatar-1` … `--avatar-5`; these are also the body colours offered in the avatar editor and used for guests. Load the Google Fonts link in `index.html`. Use plain CSS with variables (CSS Modules or one global stylesheet), with no UI library and no Tailwind.

**Shared components** (in `src/components/ui/`, built from the preview's classes):
- `Button` (primary/secondary/danger/scan)
- `Card`
- `Chip`
- `Avatar`: a DiceBear "Clay" image (`@dicebear/core` 10.x + `@dicebear/styles`, rendered on the device so it works offline; artwork CC0). Guests are seeded with their name on the dark `--surface-2` background with a palette body colour; registered players use their stored options. The editor offers body, eyes, mouth, top (or none), pattern (or none), body colour and background.
- `PlayerRow`
- `ScoreRow`
- `Badge`
- `Toast`
- `BottomSheet` (slides up over a dimmed backdrop; tapping the backdrop closes it the same way as its cancel/close button, without applying anything)
- `Screen` (top bar + content + bottom footer)

Screens are composed from these components. A screen does not style things on its own.

**Frame → component**
| Frame | Component |
|---|---|
| 1, 1b, 1c | `Setup.tsx`, `Rules.tsx` (setup with the logged-in player added and the "Regler" top-bar button; rules sheet via `BottomSheet`; logged-in player removed, with "+ Lägg till {namn}") |
| 2–4 | `Reveal.tsx` (pass, word, impostor) |
| 5 | `Play.tsx` |
| 6a, 6b, 6c | `Vote.tsx` (pass, pick with the voter left out, vote cast) |
| 7, 8, 8b | `End.tsx` (impostor caught, impostor got away, both with the vote list, everyone's round points and totals; "Ändra" sheet via `CategoryPicker`) |
| 9 | `Scoreboard.tsx` |
| 10 | `QrScanner.tsx` |
| 11 | `account/Login.tsx` |
| 12, 12b | `account/Profile.tsx`, `account/AvatarEditor.tsx` (profile; avatar editor sheet) |
| 13 | `account/MyQr.tsx` |

**Rules the mock-up can't show**
- Use only the token colours, never raw hex values in components. `--impostor` red is reserved for the impostor reveal, "Avslöja bedragaren", "Fel!" and the impostor's points badge on the round result. `--success` green is reserved for "Rätt!", points (including other players' round badges) and registered/saved states.
- One main action per screen, in the bottom footer. Buttons span the full width and are at least 52px tall.
- Mobile first: a single column at most 420px wide, centred, with no horizontal scroll at 360px width.
- The Swedish texts in the preview are the final wording. Texts missing from the preview (errors, empty states) follow the same tone: short, informal "du".
- Disabled and error states follow `PLAN.md` (Game flow), not the mock-up.

**Ignore in the preview:**
- The page around the frames (header, style guide, gallery, phone frames).
- The mock QR script. Use `qrcode.react`.
- The example names, words and numbers.

**Keeping it uniform later.** When the frontend is set up, react-specialist creates `frontend/CLAUDE.md` with these lasting rules. Claude Code loads it automatically for all future work in `frontend/`:
- Always use the `tokens.css` variables. Never add new colours or fonts.
- Reuse the components in `src/components/ui/` before creating new ones. New shared UI goes there.
- One main action per screen, in the footer. Red is only for the impostor.
- All UI text is in Swedish.

After v1 is built, the code (`tokens.css` + `ui/`) is the source of truth. `design/preview.html` remains as the historical reference.

## Hosting
Goal: any machine with Docker, including a Raspberry Pi, can host the app with `cp .env.example .env`, an edit of a few values, and `make start`.

**Services** in `docker-compose.yml`. All use `restart: unless-stopped`, so the app comes back after the Pi reboots.
- `db` (`mariadb:11`):
  - It has a named volume for data. It creates the empty database and app user from `MARIADB_*`; the tables come from migrations.
  - It is started with utf8mb4 / Swedish collation flags (see Database schema → Character set).
  - A healthcheck uses `healthcheck.sh --connect --innodb_initialized`.
  - Port 3306 is published only on `127.0.0.1:${DB_PORT}`, so native dev can reach it but the LAN can't.
- `backend` (built from `backend/`):
  - It gets only what it needs, listed explicitly under `environment:` (no `env_file`): `DB_HOST=db`, `DB_PORT=3306`, `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD` and `SECRET_KEY`. The DB root password stays with the `db` container. `DB_PORT` is fixed at 3306 because the backend reaches `db` on the internal network, not through the published port.
  - It waits on `depends_on: db: condition: service_healthy`.
  - It is not published; only `web` reaches it.
- `web` (built from `frontend/`):
  - Caddy serves the built SPA and proxies `/api/*` to `backend:8000`. It publishes `${HTTP_PORT}` and `${HTTPS_PORT}`, on the same port numbers inside the container.
  - A named volume for `/data` keeps Caddy's certificates and its local CA across restarts, so phones only accept the certificate once.

**`.env`.** `.env.example` is committed with comments, and `.env` is gitignored. It holds only what a host may need to change:
| Variable | Example | Purpose |
|---|---|---|
| `SITE_ADDRESS` | `raspberrypi.local` or `192.168.1.50` | Hostname or IP that players open; Caddy issues the cert for it |
| `PROTOCOL` | `https` (default) or `http` | `http`: plain HTTP on `HTTP_PORT`, no certificate, `TLS_MODE` ignored (camera won't work on phones without HTTPS in front) |
| `TLS_MODE` | `internal` (default) or `acme` | `internal`: Caddy's own CA, for LAN use. `acme`: Let's Encrypt, for a public domain in `SITE_ADDRESS` |
| `HTTP_PORT` / `HTTPS_PORT` | `80` / `443` | Ports published by `web` |
| `MARIADB_ROOT_PASSWORD` | – | DB root password |
| `MARIADB_DATABASE` / `MARIADB_USER` / `MARIADB_PASSWORD` | `impostor` / `impostor` / – | App database and user, used by both `db` and `backend` |
| `DB_PORT` | `3306` | Localhost-only DB port for native dev |
| `SECRET_KEY` | – | JWT signing key; `.env.example` tells the host to generate one with `openssl rand -hex 32` |

- The Caddyfile reads `{$SITE_ADDRESS}` and sets the global `default_sni {$SITE_ADDRESS}`. Browsers send no SNI when the address is an IP, and behind Docker's NAT Caddy can't match the certificate by its local address, so without this the TLS handshake fails. The global `http_port {$HTTP_PORT}` makes the http→https redirect listen on the published port. `https_port` stays at its default 443 on purpose: Caddy leaves that port out of redirect URLs, so setting it would drop a non-default `HTTPS_PORT` from the redirect. `import site_{$PROTOCOL}_{$TLS_MODE}` picks one of four site snippets: `https://{$SITE_ADDRESS}:{$HTTPS_PORT}` with `tls internal` or with Caddy's automatic HTTPS (acme), or `http://{$SITE_ADDRESS}:{$HTTP_PORT}` without TLS for either `TLS_MODE`. The port is in the site address so Caddy's http→https redirect includes it. All four share an `(app)` snippet (gzip, `/api/*` proxy, SPA files).
- `backend/app/config.py` builds the DB URL from `MARIADB_*`, `DB_HOST` (default `127.0.0.1`) and `DB_PORT`. Native dev therefore uses the same root `.env` with no extra file.
  - The `.env` path is computed from `config.py`'s own location (`Path(__file__).resolve().parents[2] / ".env"`), so uvicorn, alembic and pytest find it whatever folder they are started from.
  - A missing `.env` is ignored. In Docker it doesn't exist (it isn't in the `backend/` build context), and the values come from `environment:`. Real environment variables take precedence over the file.
  - Settings unrelated to the backend in the shared `.env` (`SITE_ADDRESS`, ports, root password) are ignored (`extra="ignore"`).
- Token lifetimes keep their code defaults and are not in `.env`.
- `.env.example` documents the ports next to `HTTP_PORT`/`HTTPS_PORT`:
  - With an `HTTPS_PORT` other than 443, players open `https://<SITE_ADDRESS>:<HTTPS_PORT>`; `HTTP_PORT` redirects there.
  - With `PROTOCOL=http`, players open `http://<SITE_ADDRESS>:<HTTP_PORT>`.
  - `TLS_MODE=acme` (Let's Encrypt) requires `HTTP_PORT=80` and `HTTPS_PORT=443` to be reachable from the internet (documented only).

**HTTPS on the LAN.** The camera needs HTTPS, so `TLS_MODE=internal` is the default.
- Each phone shows a certificate warning the first time and has to accept it.
- This should be verified on a real iPhone and Android phone. If the camera doesn't work after the warning is accepted, the README explains how to install Caddy's root CA from the `web` container (`/data/caddy/pki/authorities/local/root.crt`) on the phone.

**Raspberry Pi.**
- It needs a 64-bit OS (Raspberry Pi OS 64-bit) on a Pi 3B+, 4 or 5. Docker is installed with `curl -fsSL https://get.docker.com | sh`.
- Every image the app uses (`mariadb:11`, `python:3.12-slim`, `node:22-alpine`, `caddy:2-alpine`) is multi-arch with `linux/arm64`. The Python dependencies have arm64 wheels (`argon2-cffi`) or are pure Python. The Dockerfiles must not pin `--platform` or download amd64-only binaries.
- Images are built on the Pi itself with `--build`. There is no registry or cross-build step. The frontend build is the slowest part, and on a 1 GB Pi 3B+ it may need swap. The README mentions this.
- `SITE_ADDRESS=<hostname>.local` uses the Pi's mDNS name, so it keeps working if its IP changes.

**Makefile** (repo root) has five targets: `start` and `update` for the server, and `backup` and `migrate`, which `update` (and `start`, for `migrate`) call and which can also be run on their own, plus `import`, which loads the word list and is only run by hand. Targets that call other targets use `$(MAKE) <target>`, not plain `make`, so flags and variables like `BACKUP_KEEP` are passed on.
- `make migrate` runs `docker compose run --rm backend alembic upgrade head`. `run` starts `db` first and waits for its healthcheck, so this works on a fresh install too. It is a no-op when the DB is already at head.
- `make start` runs `docker compose build`, then `make migrate`, then `docker compose up -d`. The first start on a new server therefore creates the tables before the backend serves requests. The words are loaded separately with `make import`.
- `make update` brings the server to the latest `main` from GitHub:
  1. `git pull --ff-only origin main`. With `--ff-only`, the command stops with an error instead of creating a merge commit if the server's checkout has local commits. Git also refuses if uncommitted edits would be overwritten. The server never ends up in a half-merged state.
  2. `docker compose build`. This builds the new images while the old containers keep serving.
  3. `make backup`. Dumps the database before anything touches it (see below). If the backup fails, make stops here and nothing is migrated.
  4. `make migrate`. The new backend image applies any new migrations to the live DB. If a migration fails, make stops here and the old containers stay up. To undo a half-applied migration, restore the backup from step 3 (see Restoring, case A).
  5. `docker compose up -d`. This recreates only the containers whose image changed. The database and Caddy volumes are kept.
  6. `docker image prune -f`. This removes the old image layers left behind by every rebuild, which would otherwise slowly fill a Pi's SD card.

**Backups.** `make backup` can also be run on its own at any time.
- It first runs `docker compose up -d --wait db`, so the DB is running and healthy even if the stack was stopped.
- It dumps with `docker compose exec -T db sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --databases "$MARIADB_DATABASE"' | gzip`.
  - The password is expanded inside the container, so it never appears on the host's command line or in make's echo.
  - `--single-transaction` gives a consistent dump without locking tables, so the app keeps working during the dump.
- The output goes to `backups/impostor-YYYYMMDD-HHMMSS.sql.gz` in the repo directory. `backups/` is gitignored, so `git pull` never touches it.
- The dump is written to a `.partial` file and renamed only when it succeeds, so a failed dump never looks like a valid backup.
- The Makefile sets `SHELL := /bin/bash` and `.SHELLFLAGS := -eo pipefail -c`. Without pipefail, a failing `mariadb-dump` piped into `gzip` would count as success.
- Retention: only the newest `BACKUP_KEEP` backups are kept (default 10, override with `make update BACKUP_KEEP=20`). This keeps the SD card from filling up.
- The backups live on the same disk as the database. They protect against bad migrations and mistakes, not against a dead SD card. The README suggests copying `backups/` elsewhere now and then.

**Restoring** is a manual, deliberate step that the README documents rather than a make target, because it overwrites live data. The code checkout is never changed; the server stays on `main`.

The DB restore is the same in both cases below:
1. `docker compose stop backend`
2. `docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "DROP DATABASE \`$MARIADB_DATABASE\`"'`. The database is dropped first because loading a dump only replaces the tables the dump contains. A table created by a failed migration would otherwise survive and make the next attempt fail with "table already exists". The app user's grants are stored per database name, so they survive the drop.
3. `gunzip -c backups/<file>.sql.gz | docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"'`. The dump was made with `--databases`, so it recreates the database (with its utf8mb4 settings), every table and `alembic_version`.

Then:
- **Case A, a migration failed during `make update`.** Use the backup that step 3 of `make update` just made. Run `docker compose start backend`. This starts the **old** backend container, which `make update` never replaced because it stopped before `up -d`, so the code matches the restored schema. Fix the migration on `main`, then run `make update` again. Until then, don't run `make start` or `make migrate`; they would run the broken migration again.
- **Case B, going back to an older backup** (for example after a mistake). Run `make migrate`, then `docker compose start backend`. Migrations only go forward, so `alembic upgrade head` brings the older schema up to the current code. The data is the backup's, and the code stays current.

Migrations run as a separate make step, not in the backend container's startup command. A failed migration then stops `make update` with a visible error, instead of leaving the backend crash-looping under `restart: unless-stopped`.

All targets are `.PHONY`. Each recipe line echoes what it does, and the first failing step stops the run. `make start` is the default target, so a plain `make` also starts the stack.

**README.md** has these hosting steps:
1. Install Docker, git and make. On Raspberry Pi OS Lite, install make with `sudo apt install make`.
2. Clone the repo.
3. `cp .env.example .env` and set the passwords, `SECRET_KEY` and `SITE_ADDRESS`.
4. `make start`.
5. Open `https://<SITE_ADDRESS>` and accept the certificate.

It also covers:
- Updating with `make update`, which also applies new migrations.
- Rolling back one migration (see Migrations).
- Backups: where they are, how many are kept, the restore steps, and a hint to copy `backups/` off the Pi now and then.
- The dev setup: `docker compose up -d db`, then `cd backend && alembic upgrade head`, uvicorn and `npm run dev`.
- How to add a migration (see Migrations).

## Delegation
- **fastapi-developer** agent: `docker-compose.yml`, `.env.example`, `.gitignore` entries for `.env` and `backups/`, `backend/` (Dockerfile, config, models, Alembic setup + migration `0001`, the word import, security, all routes, tests), `Makefile` and `README.md`.
- **react-specialist** agent: `frontend/` (scaffold + vite config, `Dockerfile`, `Caddyfile`, `tokens.css`, `ui/` components, `api.ts`, `auth.ts`, `game.ts` + tests, all screens, `frontend/CLAUDE.md`). It gets the Design section above and is told to read `design/preview.html` first.
- The service names, ports and `.env` variables in Hosting are the shared contract for the Docker files.
- The API contract above is the interface between them, so both can run in parallel. I review and run the verification steps after.

## Verification
1. Run `cp .env.example .env`, `docker compose up -d db` and `cd backend && alembic upgrade head`, then check:
   - After `make import`, the word list rows exist: `docker compose exec db mariadb ... -e "select count(*) from words"`. Running it again adds nothing.
   - `alembic check` reports no differences between the models and the migrations.
   - `alembic downgrade base` followed by `alembic upgrade head` succeeds, which proves the downgrades work.
   - `SHOW CREATE TABLE players` shows `utf8mb4` and `utf8mb4_uca1400_swedish_ai_ci`.
   - Registering `Åsa` and saving an avatar seed with emoji, then reading it back via `/api/me`, returns both unchanged.
   - `grep -r "app.models\|from app" backend/migrations/versions` finds nothing.
2. Run `cd backend && python -m app.seed && uvicorn app.main:app --reload`, then `curl localhost:8000/api/words/random`. It should return Swedish JSON.
3. Run `pytest` in backend:
   - **Words:** filtering by multiple `category_id`s (the result is always within them), omitting the param, and the 404 case.
   - **Auth:** register, a duplicate (case-insensitive) gives 409, login with the right and wrong password, and `/api/me` with and without a token.
   - **Join:** issue then redeem returns the right player. An expired token (freeze time or use a 0 s lifetime) gives 400. An auth token used as a join token is rejected.
   - **Games:** saving with valid participant tokens updates `/api/me` stats. A forged or invalid participant token gives 400, and so does the same player twice.
4. Run `npm test` (vitest) in frontend:
   - Exactly one impostor is picked, and the starting player is one of the players.
   - The setup validation works: min 3, unique names (case-insensitive, guests and registered together), and at least 1 category.
   - `scoreRound` gives 1 p to each player who voted for the impostor, 1 p to the impostor per incorrect vote, and nothing for the impostor's own vote. Example: 4 players, two vote correctly and one incorrectly gives 1 p each to the two correct voters and 1 p to the impostor.
   - `tallyVotes` ignores the impostor's vote.
   - `roundVerdict`: the impostor alone with most votes is `'caught'`; a tie for most votes is `'escaped'`; the impostor with 0 votes is `'escaped'`.
   - `gameSummary` marks every tied leader as `won` and includes only registered players.
5. Run `npm run dev` and play through a 3-player game with guests only in the browser:
   - On Setup, "Regler" opens the rules sheet; it describes the current voting and scoring, scrolls at 360px width, and "Stäng" returns to Setup with the entered names and categories kept.
   - The impostor sees only the clue.
   - After the reveal, Play shows a starting player and the "Avslöja bedragaren" button.
   - Vote asks each player in turn, never shows the impostor, never lists the voter themselves, and never shows earlier votes. The impostor's vote turn looks the same as everyone else's.
   - End shows the correct headline, impostor, word and vote counts, and every player's round points and running total, but not who voted for whom. No points appear during the vote.
   - Play 2–3 rounds with "Nästa runda" (one round where everyone votes correctly, one with mixed votes), then "Avsluta". The scoreboard totals match the scoring rules.
   - On a round result, open "Ändra", pick a single category and press "Spara". The next round's word comes from that category. "Avbryt" leaves the categories unchanged, and "Spara" is disabled with nothing selected.
   - "Nytt spel" returns to Setup with the names and the most recent category selection kept, and the scores reset.
6. QR flow (two devices, or a laptop as the game device and a phone over `https://<lan-ip>:5173`):
   - Register on the phone and open "Visa min QR-kod".
   - On the game device, choose "Skanna QR". The player appears with their avatar.
   - Scanning the same QR again shows "Redan med". A QR older than 2 minutes is rejected.
   - Finish a game. The profile stats on the phone update.
7. Design check: I take headless Chrome screenshots of each screen at 390px width and compare them side by side with the matching preview frame. I also check:
   - `grep -rE "#[0-9a-fA-F]{3,6}\b" frontend/src --include=*.css --include=*.tsx` finds hex colours only in `tokens.css`.
   - `frontend/CLAUDE.md` exists and contains the rules listed under Design.
8. Hosting (full stack in Docker):
   - On the dev machine, `make start` creates the schema and starts all three services. `docker compose ps` shows `db` as healthy.
   - `https://<SITE_ADDRESS>` opens from a phone on the LAN after the certificate is accepted. Running the QR flow from step 6 there proves that `/api` proxying and camera access work.
   - `docker compose restart` keeps the accounts and the accepted certificate (volumes persist).
   - `docker buildx build --platform linux/arm64` succeeds for `backend/` and `frontend/`. This checks the Pi builds without needing a Pi. If a Pi is available, it runs the README steps from a fresh clone.
   - `git status` doesn't show `.env` or `backups/`.
   - `docker compose exec backend env | grep MARIADB_ROOT` finds nothing.
9. Makefile:
   - From a fresh clone with `.env` filled in, `make start` brings up all three services.
   - Test `make update` in a second clone that acts as the server. Push a visible change (for example a UI text) to `main`, then run `make update` in the second clone. The change is live, and accounts created before the update still exist.
   - **Test setup, so GitHub's `main` is never touched:**
     1. Create a bare repo in the scratchpad: `git clone --bare . <scratch>/origin.git`.
     2. Clone the server copy from it: `git clone <scratch>/origin.git <scratch>/server`. In the server copy, `origin` is the bare repo, so `make update` (`git pull origin main`) pulls from it.
     3. Push test commits from a throwaway branch in the dev clone with `git push <scratch>/origin.git HEAD:main`.
     4. Afterwards, delete the scratch repos and the throwaway branch. Nothing is pushed to GitHub.
   - Schema update: on the throwaway branch, add a test migration (for example a nullable column) and push it to the bare repo. `make update` in the server copy applies it: `docker compose run --rm backend alembic current` shows the new head, and existing accounts and stats still exist.
   - Failed migration (case A): push a migration that fails halfway, for example one that creates a table and then runs invalid SQL. `make update` stops at migrate, and the site keeps working. Follow the case A restore steps. The leftover table is gone and the old backend works. Then push a fixed migration; `make update` succeeds.
   - With a local commit, or an uncommitted edit to a file the pushed change also touches, in the server clone, `make update` fails at the `git pull` step and leaves the running containers untouched.
   - Backup: `make backup` creates a non-empty `backups/impostor-*.sql.gz`, and `make` echoes no password. After 12 runs with `BACKUP_KEEP=10`, exactly 10 files remain.
   - Failing backup: with `MARIADB_ROOT_PASSWORD` set wrong in `.env`, `make update` stops at the backup step, leaves no `.partial` file behind, and doesn't run migrations.
   - Restore (case B): create an account, take a backup, delete the account in the DB, then follow the case B restore steps. The account is back and `git status` in the server copy still shows branch `main`.
