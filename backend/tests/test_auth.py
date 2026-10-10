from tests.conftest import auth_header, register


def test_register_returns_token_and_player(client):
    body = register(client, "  Anna  ")
    assert body["token"]
    player = body["player"]
    assert player["username"] == "Anna"
    assert player["avatar_emoji"] == "🙂"
    assert player["avatar_color"] in {"#FFB547", "#8C7BFF", "#3DDC97", "#FF8FB1", "#5CC8FF"}
    assert "password" not in str(body)


def test_register_duplicate_is_case_insensitive(client):
    register(client, "Anna")
    for name in ("Anna", "anna", "ANNA"):
        r = client.post(
            "/api/auth/register", json={"username": name, "password": "hemligt1"}
        )
        assert r.status_code == 409


def test_register_validation(client):
    post = lambda u, p: client.post(
        "/api/auth/register", json={"username": u, "password": p}
    ).status_code
    assert post("A", "hemligt1") == 422
    assert post("x" * 31, "hemligt1") == 422
    assert post("Anna", "12345") == 422
    assert post(" A ", "hemligt1") == 422  # trimmed to 1 char
    assert post("Ab", "123456") == 200


def test_login(client):
    register(client, "Anna", "hemligt1")
    ok = client.post("/api/auth/login", json={"username": "anna", "password": "hemligt1"})
    assert ok.status_code == 200
    assert ok.json()["player"]["username"] == "Anna"
    assert ok.json()["token"]
    bad = client.post("/api/auth/login", json={"username": "Anna", "password": "fel"})
    assert bad.status_code == 401
    unknown = client.post("/api/auth/login", json={"username": "Nobody", "password": "hemligt1"})
    assert unknown.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers=auth_header("garbage")).status_code == 401


def test_me_returns_player_and_zero_stats(client):
    token = register(client)["token"]
    r = client.get("/api/me", headers=auth_header(token))
    assert r.status_code == 200
    body = r.json()
    assert body["player"]["username"] == "Anna"
    assert body["stats"] == {"games": 0, "wins": 0, "total_points": 0, "impostor_rounds": 0}


def test_patch_me_updates_avatar(client):
    token = register(client)["token"]
    r = client.patch(
        "/api/me",
        headers=auth_header(token),
        json={"avatar_emoji": "🦊", "avatar_color": "#3DDC97"},
    )
    assert r.status_code == 200
    assert r.json()["avatar_emoji"] == "🦊"
    me = client.get("/api/me", headers=auth_header(token)).json()["player"]
    assert (me["avatar_emoji"], me["avatar_color"]) == ("🦊", "#3DDC97")
    # Partial update keeps the other field.
    client.patch("/api/me", headers=auth_header(token), json={"avatar_emoji": "🐱"})
    me = client.get("/api/me", headers=auth_header(token)).json()["player"]
    assert (me["avatar_emoji"], me["avatar_color"]) == ("🐱", "#3DDC97")


def test_patch_me_validation_and_auth(client):
    token = register(client)["token"]
    h = auth_header(token)
    assert client.patch("/api/me", headers=h, json={"avatar_color": "red"}).status_code == 422
    assert client.patch("/api/me", headers=h, json={"avatar_emoji": ""}).status_code == 422
    assert client.patch("/api/me", json={"avatar_emoji": "🦊"}).status_code == 401


def test_join_token_is_not_an_auth_token(client):
    token = register(client)["token"]
    join = client.post("/api/join-tokens", headers=auth_header(token)).json()["token"]
    assert client.get("/api/me", headers=auth_header(join)).status_code == 401


def test_swedish_names_roundtrip(client):
    token = register(client, "Åsa")["token"]
    client.patch("/api/me", headers=auth_header(token), json={"avatar_emoji": "🦊"})
    p = client.get("/api/me", headers=auth_header(token)).json()["player"]
    assert (p["username"], p["avatar_emoji"]) == ("Åsa", "🦊")
