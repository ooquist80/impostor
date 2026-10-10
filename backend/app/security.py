from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import settings

ALGORITHM = "HS256"
AUTH = "auth"
JOIN = "join"
PARTICIPANT = "participant"

_hasher = PasswordHash.recommended()
# Verified against when the email is unknown, so login timing doesn't
# reveal which emails are registered.
_DUMMY_HASH = _hasher.hash("dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        _hasher.verify(password, _DUMMY_HASH)
        return False
    return _hasher.verify(password, password_hash)


def create_token(purpose: str, player_id: int, seconds: int) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=seconds)
    token = jwt.encode(
        {"purpose": purpose, "sub": str(player_id), "exp": expires_at},
        settings.secret_key,
        algorithm=ALGORITHM,
    )
    return token, expires_at


def create_auth_token(player_id: int) -> str:
    return create_token(AUTH, player_id, settings.auth_token_seconds)[0]


def create_join_token(player_id: int) -> tuple[str, datetime]:
    return create_token(JOIN, player_id, settings.join_token_seconds)


def create_participant_token(player_id: int) -> str:
    return create_token(PARTICIPANT, player_id, settings.participant_token_seconds)[0]


def verify_token(token: str, purpose: str) -> int | None:
    """Return the player id if the token is valid, unexpired and has the
    expected purpose, otherwise None."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        if payload.get("purpose") != purpose:
            return None
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError, TypeError):
        return None
