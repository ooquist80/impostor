# Impostor

A pass-and-play word game in Swedish. Everyone but one player sees a secret word; the impostor only gets a clue. React frontend, FastAPI backend, MariaDB.

## Hosting

Any machine with Docker can host the app, including a Raspberry Pi.

1. Install Docker, git and make. On Raspberry Pi OS Lite, install make with `sudo apt install make`. Docker: `curl -fsSL https://get.docker.com | sh`.
2. Clone the repo.
3. `cp .env.example .env` and set the passwords, `SECRET_KEY` (`openssl rand -hex 32`) and `SITE_ADDRESS` (for example `raspberrypi.local` or the machine's LAN IP).
4. Copy the word list to `backend/data/words.csv` (see [Word list](#word-list)).
5. `make start`. This builds the images, creates the tables, starts the stack and imports the word list.
6. Open `https://<SITE_ADDRESS>` and accept the certificate warning.

The camera (QR scanning) needs HTTPS, so `TLS_MODE=internal` (Caddy's own CA) is the default. Each phone shows a certificate warning the first time. If the camera still doesn't work after accepting it, install Caddy's root certificate on the phone. Copy it out of the web container with
`docker compose cp web:/data/caddy/pki/authorities/local/root.crt .` and install it as a trusted CA on the phone.

With non-default ports, players open `https://<SITE_ADDRESS>:<HTTPS_PORT>` (the http to https redirect assumes 443). `TLS_MODE=acme` (Let's Encrypt, for a public domain) needs ports 80 and 443 reachable from the internet.

### Raspberry Pi

Use a 64-bit OS (Raspberry Pi OS 64-bit) on a Pi 3B+, 4 or 5. All images are multi-arch (`linux/arm64`) and are built on the Pi itself. The frontend build is the slowest step; on a 1 GB Pi 3B+ it may need swap. `SITE_ADDRESS=<hostname>.local` uses the Pi's mDNS name, so it keeps working if the IP changes.

## Updating

`make update` pulls the latest `main` (fast-forward only), builds new images, backs up the database, applies new migrations, restarts the changed containers and prunes old images. If a step fails, make stops there and the old containers keep running.

## Word list

The words are not in git. They live in `backend/data/words.csv`, which is gitignored, and the backend imports the file every time it starts. In Docker the folder is mounted read-only at `/app/data`. `WORDS_CSV` overrides the path.

- Format: UTF-8 with the header `category,word,clue`, one word per line. Quote a value that contains a comma (`"Monsters, Inc."`). `backend/data/words.example.csv` shows the format.
- The import only adds: new categories and words (matched on category + word, ignoring case) are inserted. Changing a clue or removing a line does not change the database; do that in SQL.
- If the file is missing, the backend logs a warning and starts with the words it already has. A malformed file (wrong header, empty value) stops the backend from starting, with the line number in the log.
- `git pull` never brings the list to a server. Copy it yourself, for example `scp backend/data/words.csv pi@raspberrypi.local:impostor/backend/data/`, then `docker compose restart backend`.

### Rolling back one migration

`docker compose run --rm backend alembic downgrade -1`

## Backups

`make backup` writes `backups/impostor-YYYYMMDD-HHMMSS.sql.gz` and keeps the newest 10 (`make backup BACKUP_KEEP=20` to change; also works with `make update BACKUP_KEEP=20`). `make update` runs it before every migration. `backups/` is gitignored.

The backups are on the same disk as the database. They protect against bad migrations and mistakes, not against a dead SD card, so copy `backups/` somewhere else now and then.

### Restoring

Restoring overwrites live data, so it is manual. The code checkout is never changed; the server stays on `main`.

1. `docker compose stop backend`
2. Drop the database (a table left by a failed migration would otherwise survive):
   ```
   docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "DROP DATABASE \`$MARIADB_DATABASE\`"'
   ```
3. Load the dump:
   ```
   gunzip -c backups/<file>.sql.gz | docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"'
   ```

Then, depending on why you restore:

- **A migration failed during `make update`.** Use the backup that `make update` just made. Run `docker compose start backend`. This starts the old backend container (which `make update` never replaced), so the code matches the restored schema. Fix the migration on `main`, then run `make update` again. Until then, don't run `make start` or `make migrate`; they would run the broken migration again.
- **Going back to an older backup.** Run `make migrate`, then `docker compose start backend`. Migrations only go forward, so this brings the older schema up to the current code. The data is the backup's.

## Development

```
cp .env.example .env              # set SECRET_KEY, passwords
docker compose up -d db           # only the database
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head              # schema
uvicorn app.main:app --reload     # http://localhost:8000/api/docs, imports data/words.csv
pytest                            # tests use in-memory SQLite

cd ../frontend
npm install
npm run dev                       # https://localhost:5173, proxies /api to :8000
```

The backend reads the same root `.env` as Docker (DB on `127.0.0.1:${DB_PORT}`).

### Adding a migration

`backend/app/models.py` is the source of truth for the schema.

1. Edit the models.
2. `cd backend && alembic revision --autogenerate -m "describe change" --rev-id 0002` (next number).
3. Read and fix the generated file. Autogenerate misses renames and data changes.
4. `alembic upgrade head`, then `alembic check` (should report no differences), then `alembic downgrade -1` and `alembic upgrade head` to prove the downgrade works.

Rules:

- Migrations hold the schema only. Words go in the word list, not in a migration.
- Migrations never import the application models. A migration that touches data defines the tables inline with `sa.table(...)`.
- Never edit an applied migration; fix it in a new one.
- Every migration needs a working `downgrade()`.
- MariaDB commits DDL immediately, so a migration that fails halfway can leave the schema partly changed. Keep migrations small.
