import os

# Must be set before app modules are imported (Settings requires a key).
os.environ.setdefault("SECRET_KEY", "test-secret-key-test-secret-key-0123456789")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.deps import get_db
from app.main import app
from app.models import Base, Category, Word


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture()
def db(session_factory):
    with session_factory() as session:
        yield session


@pytest.fixture()
def client(session_factory):
    def override():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded(db):
    """Three categories with two words each. Returns {name: id}."""
    ids = {}
    for name, pairs in {
        "Djur": [("Elefant", "Snabel"), ("Giraff", "Hals")],
        "Mat": [("Pizza", "Italien"), ("Glass", "Kall")],
        "Sport": [("Fotboll", "Mål"), ("Tennis", "Racket")],
    }.items():
        cat = Category(name=name)
        db.add(cat)
        db.flush()
        for word, clue in pairs:
            db.add(Word(word=word, clue=clue, category_id=cat.id))
        ids[name] = cat.id
    db.commit()
    return ids


def register(client, name="Anna", password="hemligt1", email=None):
    """Registers a player. The email defaults to one derived from the name."""
    email = email or f"{name.strip().lower()}@example.com"
    r = client.post(
        "/api/auth/register",
        json={"email": email, "name": name, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def participant_token(client, token):
    """Issue a join token as the player, redeem it, return participant token."""
    jt = client.post("/api/join-tokens", headers=auth_header(token)).json()["token"]
    r = client.post("/api/join-tokens/redeem", json={"token": jt})
    assert r.status_code == 200, r.text
    return r.json()["participant_token"]
