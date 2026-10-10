import time
from datetime import datetime

import jwt

from app import security
from app.config import settings
from tests.conftest import auth_header, register


def test_issue_requires_auth(client):
    assert client.post("/api/join-tokens").status_code == 401


def test_issue_then_redeem_returns_right_player(client):
    reg = register(client, "Anna")
    r = client.post("/api/join-tokens", headers=auth_header(reg["token"]))
    assert r.status_code == 200
    body = r.json()
    assert datetime.fromisoformat(body["expires_at"])
    claims = jwt.decode(body["token"], settings.secret_key, algorithms=["HS256"])
    assert claims["purpose"] == "join"
    assert claims["sub"] == str(reg["player"]["id"])
    assert 0 < claims["exp"] - time.time() <= 120

    # Redeem needs no auth.
    red = client.post("/api/join-tokens/redeem", json={"token": body["token"]})
    assert red.status_code == 200
    out = red.json()
    assert out["player"]["id"] == reg["player"]["id"]
    assert out["player"]["name"] == "Anna"
    assert "email" not in out["player"]
    pclaims = jwt.decode(out["participant_token"], settings.secret_key, algorithms=["HS256"])
    assert pclaims["purpose"] == "participant"
    assert 23 * 3600 < pclaims["exp"] - time.time() <= 24 * 3600


def test_expired_join_token_rejected(client, monkeypatch):
    reg = register(client)
    monkeypatch.setattr(settings, "join_token_seconds", -5)
    token = client.post("/api/join-tokens", headers=auth_header(reg["token"])).json()["token"]
    r = client.post("/api/join-tokens/redeem", json={"token": token})
    assert r.status_code == 400


def test_auth_token_rejected_as_join_token(client):
    reg = register(client)
    r = client.post("/api/join-tokens/redeem", json={"token": reg["token"]})
    assert r.status_code == 400


def test_participant_token_rejected_as_join_token(client):
    reg = register(client)
    pt = security.create_participant_token(reg["player"]["id"])
    assert client.post("/api/join-tokens/redeem", json={"token": pt}).status_code == 400


def test_garbage_and_forged_tokens_rejected(client):
    reg = register(client)
    assert client.post("/api/join-tokens/redeem", json={"token": "nope"}).status_code == 400
    forged = jwt.encode(
        {"purpose": "join", "sub": str(reg["player"]["id"]), "exp": time.time() + 60},
        "another-key-another-key-another-key-0000",
        algorithm="HS256",
    )
    assert client.post("/api/join-tokens/redeem", json={"token": forged}).status_code == 400


def test_token_for_missing_player_rejected(client):
    token, _ = security.create_join_token(424242)
    assert client.post("/api/join-tokens/redeem", json={"token": token}).status_code == 400
