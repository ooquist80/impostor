# Server helper targets. See README.md.
SHELL := /bin/bash
.SHELLFLAGS := -eo pipefail -c
.DEFAULT_GOAL := start

BACKUP_KEEP ?= 10

.PHONY: start update backup migrate

# Build, apply migrations, then start the whole stack.
start:
	docker compose build
	$(MAKE) migrate
	docker compose up -d

# Bring the server to the latest main: pull, build, back up, migrate, restart.
update:
	git pull --ff-only origin main
	docker compose build
	$(MAKE) backup
	$(MAKE) migrate
	docker compose up -d
	docker image prune -f

# Apply pending migrations (starts db and waits for it to be healthy).
migrate:
	docker compose run --rm backend alembic upgrade head

# Gzipped dump to backups/, keeping the newest BACKUP_KEEP files.
# The root password is expanded inside the container, never on the host.
backup:
	mkdir -p backups
	docker compose up -d --wait db
	f=backups/impostor-$$(date +%Y%m%d-%H%M%S).sql.gz; \
	{ docker compose exec -T db sh -c 'mariadb-dump -uroot -p"$$MARIADB_ROOT_PASSWORD" --single-transaction --databases "$$MARIADB_DATABASE"' | gzip > "$$f.partial"; } \
		|| { rm -f "$$f.partial"; echo "Backup failed" >&2; exit 1; }; \
	mv "$$f.partial" "$$f"; \
	echo "Backup written to $$f"; \
	ls -1 backups/impostor-*.sql.gz | sort -r | tail -n +$$(($(BACKUP_KEEP) + 1)) | xargs -r rm -f --
