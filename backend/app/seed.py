"""Imports the word list from a CSV file (columns: category, word, clue).

Run with `python -m app.seed [path]` (`make import` in Docker). The path
defaults to the WORDS_CSV setting, backend/data/words.csv.

The import only adds: categories and words missing from the database are
inserted, and nothing already there is changed or removed. A word counts as
present when its category already has a word with the same text.
"""
import csv
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import Category, Word

COLUMNS = ("category", "word", "clue")


def read_words(path: Path) -> list[tuple[str, str, str]]:
    """Returns (category, word, clue) rows. Blank lines are skipped."""
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if tuple(reader.fieldnames or ()) != COLUMNS:
            raise ValueError(f"{path}: the header must be {','.join(COLUMNS)}")
        rows = []
        for line, row in enumerate(reader, start=2):
            values = tuple((row[c] or "").strip() for c in COLUMNS)
            if not any(values):
                continue
            if not all(values):
                raise ValueError(f"{path}:{line}: category, word and clue are all required")
            rows.append(values)
        return rows


def import_words(db: Session, rows: list[tuple[str, str, str]]) -> tuple[int, int]:
    """Inserts missing categories and words. Returns (categories added, words added)."""
    categories = {c.name.casefold(): c for c in db.scalars(select(Category))}
    existing = {(w.category_id, w.word.casefold()) for w in db.scalars(select(Word))}
    new_categories = new_words = 0
    for category_name, word, clue in rows:
        category = categories.get(category_name.casefold())
        if category is None:
            category = Category(name=category_name)
            db.add(category)
            db.flush()
            categories[category_name.casefold()] = category
            new_categories += 1
        key = (category.id, word.casefold())
        if key in existing:
            continue
        db.add(Word(word=word, clue=clue, category_id=category.id))
        existing.add(key)
        new_words += 1
    db.commit()
    return new_categories, new_words


def main(argv: list[str]) -> int:
    path = Path(argv[0]) if argv else settings.words_csv
    if not path.is_file():
        print(f"Word list {path} not found", file=sys.stderr)
        return 1
    try:
        rows = read_words(path)
    except ValueError as err:
        print(err, file=sys.stderr)
        return 1
    with SessionLocal() as db:
        categories, words = import_words(db, rows)
    print(f"Imported {path}: {categories} new categories, {words} new words")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
