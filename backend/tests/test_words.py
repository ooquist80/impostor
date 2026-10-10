def test_categories(client, seeded):
    r = client.get("/api/categories")
    assert r.status_code == 200
    assert {c["name"] for c in r.json()} == {"Djur", "Mat", "Sport"}
    assert all(set(c) == {"id", "name"} for c in r.json())


def test_random_filtered_by_multiple_categories(client, seeded):
    allowed = {"Djur", "Sport"}
    params = [("category_id", seeded["Djur"]), ("category_id", seeded["Sport"])]
    seen = set()
    for _ in range(40):
        r = client.get("/api/words/random", params=params)
        assert r.status_code == 200
        body = r.json()
        assert set(body) == {"word", "clue", "category"}
        assert body["category"] in allowed
        seen.add(body["category"])
    assert seen == allowed


def test_random_single_category(client, seeded):
    for _ in range(10):
        r = client.get("/api/words/random", params={"category_id": seeded["Mat"]})
        assert r.json()["category"] == "Mat"


def test_random_without_param_uses_all(client, seeded):
    seen = {client.get("/api/words/random").json()["category"] for _ in range(80)}
    assert seen == {"Djur", "Mat", "Sport"}


def test_random_returns_swedish_characters(client, seeded):
    r = client.get("/api/words/random", params={"category_id": seeded["Sport"]})
    assert r.json()["word"] in {"Fotboll", "Tennis"}


def test_random_404_when_no_match(client, seeded):
    assert client.get("/api/words/random", params={"category_id": 9999}).status_code == 404


def test_random_404_when_empty(client):
    assert client.get("/api/words/random").status_code == 404
