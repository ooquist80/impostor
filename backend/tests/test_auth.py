from tests.conftest import auth_header, register


def post_register(client, email="anna@example.com", name="Anna", password="hemligt1"):
    return client.post(
        "/api/auth/register", json={"email": email, "name": name, "password": password}
    )


def test_register_returns_token_and_player(client):
    body = register(client, "  Anna  ", email="Anna@Example.com")
    assert body["token"]
    player = body["player"]
    assert player["name"] == "Anna"
    # A new player gets a random seed and no editor picks.
    assert set(player["avatar"]) == {"seed"} and len(player["avatar"]["seed"]) == 16
    # The email is never part of the public player data.
    assert "email" not in player
    assert "password" not in str(body)


def test_register_duplicate_email_is_case_insensitive(client):
    register(client, "Anna", email="anna@example.com")
    for email in ("anna@example.com", "Anna@Example.com", "ANNA@EXAMPLE.COM"):
        assert post_register(client, email=email, name="Någon annan").status_code == 409


def test_names_need_not_be_unique(client):
    a = register(client, "Anna", email="anna1@example.com")
    b = register(client, "Anna", email="anna2@example.com")
    assert a["player"]["id"] != b["player"]["id"]
    assert a["player"]["name"] == b["player"]["name"] == "Anna"


def test_register_validation(client):
    status = lambda **kw: post_register(client, **kw).status_code
    for bad_email in ("", "anna", "anna@", "@example.com", "anna@example", "anna example@x.se"):
        assert status(email=bad_email) == 422, bad_email
    assert status(name="A") == 422
    assert status(name=" A ") == 422  # trimmed to 1 char
    assert status(name="x" * 31) == 422
    assert status(password="12345") == 422
    assert post_register(client, email="ab@example.com", name="Ab", password="123456").status_code == 200


def test_login_with_email(client):
    register(client, "Anna", "hemligt1", email="anna@example.com")
    ok = client.post("/api/auth/login", json={"email": " ANNA@example.com ", "password": "hemligt1"})
    assert ok.status_code == 200
    assert ok.json()["player"]["name"] == "Anna"
    assert ok.json()["token"]
    bad = client.post("/api/auth/login", json={"email": "anna@example.com", "password": "fel"})
    assert bad.status_code == 401
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "hemligt1"})
    assert unknown.status_code == 401
    # The display name is not a login.
    by_name = client.post("/api/auth/login", json={"email": "Anna", "password": "hemligt1"})
    assert by_name.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers=auth_header("garbage")).status_code == 401


def test_me_returns_player_email_and_zero_stats(client):
    token = register(client, email="Anna@Example.com")["token"]
    r = client.get("/api/me", headers=auth_header(token))
    assert r.status_code == 200
    body = r.json()
    assert body["player"]["name"] == "Anna"
    assert body["email"] == "anna@example.com"
    assert body["stats"] == {"games": 0, "wins": 0, "total_points": 0, "impostor_rounds": 0}


def test_patch_me_updates_avatar(client):
    token = register(client)["token"]
    avatar = {
        "seed": "abc", "body": "egg", "eyes": "googly", "mouth": "smileBig", "top": "antenna",
        "pattern": "none", "bodyColor": "#3DDC97", "backgroundColor": "#2A2654",
    }
    r = client.patch("/api/me", headers=auth_header(token), json={"avatar": avatar})
    assert r.status_code == 200
    assert r.json()["avatar"] == avatar
    me = client.get("/api/me", headers=auth_header(token)).json()["player"]
    assert me["avatar"] == avatar
    # The whole avatar is replaced: picks left out go back to the seed's choice.
    client.patch("/api/me", headers=auth_header(token), json={"avatar": {"seed": "xyz"}})
    me = client.get("/api/me", headers=auth_header(token)).json()["player"]
    assert me["avatar"] == {"seed": "xyz"}


def test_patch_me_validation_and_auth(client):
    token = register(client)["token"]
    h = auth_header(token)
    bad = [
        {},
        {"seed": ""},
        {"seed": "x" * 65},
        {"seed": "a", "eyes": "variant3W14"},  # old Thumbs options
        {"seed": "a", "body": "none"},  # only top and pattern can be left out
        {"seed": "a", "mouth": "Smile"},
        {"seed": "a", "top": "hat"},
        {"seed": "a", "bodyColor": "red"},
        {"seed": "a", "backgroundColor": "#12345"},
        {"seed": "a", "hair": "long"},  # unknown options are rejected
    ]
    for avatar in bad:
        assert client.patch("/api/me", headers=h, json={"avatar": avatar}).status_code == 422, avatar
    assert client.patch("/api/me", json={"avatar": {"seed": "a"}}).status_code == 401


def test_join_token_is_not_an_auth_token(client):
    token = register(client)["token"]
    join = client.post("/api/join-tokens", headers=auth_header(token)).json()["token"]
    assert client.get("/api/me", headers=auth_header(join)).status_code == 401


def test_swedish_names_roundtrip(client):
    token = register(client, "Åsa", email="asa@example.com")["token"]
    client.patch("/api/me", headers=auth_header(token), json={"avatar": {"seed": "Åsa ✨"}})
    p = client.get("/api/me", headers=auth_header(token)).json()["player"]
    assert (p["name"], p["avatar"]["seed"]) == ("Åsa", "Åsa ✨")
