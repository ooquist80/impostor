import time

import jwt

from app import security
from app.config import settings
from tests.conftest import auth_header, participant_token, register


def entry(pt, points=3, impostor_rounds=1, won=True):
    return {
        "participant_token": pt,
        "points": points,
        "impostor_rounds": impostor_rounds,
        "won": won,
    }


def test_save_game_updates_stats(client):
    anna = register(client, "Anna")
    erik = register(client, "Erik")
    r = client.post(
        "/api/games",
        json={
            "rounds": 3,
            "players": [
                entry(participant_token(client, anna["token"]), 5, 1, True),
                entry(participant_token(client, erik["token"]), 2, 2, False),
            ],
        },
    )
    assert r.status_code == 201
    assert isinstance(r.json()["id"], int)

    # A second game for Anna accumulates.
    client.post(
        "/api/games",
        json={"rounds": 1, "players": [entry(participant_token(client, anna["token"]), 1, 0, False)]},
    )

    a = client.get("/api/me", headers=auth_header(anna["token"])).json()["stats"]
    assert a == {"games": 2, "wins": 1, "total_points": 6, "impostor_rounds": 1}
    e = client.get("/api/me", headers=auth_header(erik["token"])).json()["stats"]
    assert e == {"games": 1, "wins": 0, "total_points": 2, "impostor_rounds": 2}


def test_empty_players_is_400(client):
    assert client.post("/api/games", json={"rounds": 1, "players": []}).status_code == 400


def test_invalid_token_is_400(client):
    r = client.post("/api/games", json={"rounds": 1, "players": [entry("nope")]})
    assert r.status_code == 400


def test_forged_token_is_400(client):
    anna = register(client)
    forged = jwt.encode(
        {"purpose": "participant", "sub": str(anna["player"]["id"]), "exp": time.time() + 60},
        "another-key-another-key-another-key-0000",
        algorithm="HS256",
    )
    r = client.post("/api/games", json={"rounds": 1, "players": [entry(forged)]})
    assert r.status_code == 400


def test_wrong_purpose_is_400(client):
    anna = register(client)
    for token in (anna["token"], security.create_join_token(anna["player"]["id"])[0]):
        r = client.post("/api/games", json={"rounds": 1, "players": [entry(token)]})
        assert r.status_code == 400


def test_expired_participant_token_is_400(client, monkeypatch):
    anna = register(client)
    monkeypatch.setattr(settings, "participant_token_seconds", -5)
    pt = participant_token(client, anna["token"])
    assert client.post("/api/games", json={"rounds": 1, "players": [entry(pt)]}).status_code == 400


def test_same_player_twice_is_400_and_saves_nothing(client):
    anna = register(client)
    pt1 = participant_token(client, anna["token"])
    pt2 = participant_token(client, anna["token"])
    r = client.post("/api/games", json={"rounds": 1, "players": [entry(pt1), entry(pt2)]})
    assert r.status_code == 400
    stats = client.get("/api/me", headers=auth_header(anna["token"])).json()["stats"]
    assert stats["games"] == 0


def test_one_invalid_among_valid_saves_nothing(client):
    anna = register(client)
    r = client.post(
        "/api/games",
        json={"rounds": 1, "players": [entry(participant_token(client, anna["token"])), entry("bad")]},
    )
    assert r.status_code == 400
    assert client.get("/api/me", headers=auth_header(anna["token"])).json()["stats"]["games"] == 0
