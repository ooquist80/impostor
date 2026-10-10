from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

# <repo>/.env, computed from this file so uvicorn, alembic and pytest find it
# from any working directory. A missing file is ignored (Docker passes real
# environment variables, which take precedence over the file).
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

# backend/data/words.csv natively, /app/data/words.csv in Docker (bind-mounted).
DEFAULT_WORDS_CSV = Path(__file__).resolve().parents[1] / "data" / "words.csv"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mariadb_database: str = "impostor"
    mariadb_user: str = "impostor"
    mariadb_password: str = ""
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    secret_key: str

    # Word list imported on startup (see app/seed.py). Gitignored; a missing file is skipped.
    words_csv: Path = DEFAULT_WORDS_CSV

    # Token lifetimes (seconds). Not in .env; code defaults.
    auth_token_seconds: int = 30 * 24 * 3600
    join_token_seconds: int = 2 * 60
    participant_token_seconds: int = 24 * 3600

    @property
    def database_url(self) -> URL:
        return URL.create(
            "mysql+pymysql",
            username=self.mariadb_user,
            password=self.mariadb_password,
            host=self.db_host,
            port=self.db_port,
            database=self.mariadb_database,
            query={"charset": "utf8mb4"},
        )


settings = Settings()
