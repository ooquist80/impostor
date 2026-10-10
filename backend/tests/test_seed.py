import pytest
from sqlalchemy import select

from app.models import Category, Word
from app.seed import import_words, main, read_words


def write(tmp_path, text):
    path = tmp_path / "words.csv"
    path.write_text(text, encoding="utf-8")
    return path


def words_in(db):
    rows = db.execute(select(Category.name, Word.word, Word.clue).join(Word))
    return sorted(tuple(r) for r in rows)


def test_read_words_handles_quotes_and_blank_lines(tmp_path):
    path = write(
        tmp_path,
        'category,word,clue\nFilm,"Monsters, Inc.",Dörrar\n\nTeknik,Pi,"3,14"\n',
    )
    assert read_words(path) == [("Film", "Monsters, Inc.", "Dörrar"), ("Teknik", "Pi", "3,14")]


def test_read_words_rejects_wrong_header(tmp_path):
    with pytest.raises(ValueError, match="header"):
        read_words(write(tmp_path, "kategori,ord,ledtråd\nDjur,Älg,Skog\n"))


def test_read_words_rejects_missing_value(tmp_path):
    with pytest.raises(ValueError, match=":2:"):
        read_words(write(tmp_path, "category,word,clue\nDjur,Älg,\n"))


def test_import_adds_categories_and_words(db):
    added = import_words(db, [("Djur", "Älg", "Skog"), ("Djur", "Katt", "Mjau"), ("Mat", "Ost", "Hål")])
    assert added == (2, 3)
    assert words_in(db) == [("Djur", "Katt", "Mjau"), ("Djur", "Älg", "Skog"), ("Mat", "Ost", "Hål")]


def test_import_only_adds(db, seeded):
    # Existing words are kept as they are, even with a new clue in the file; nothing is removed.
    added = import_words(db, [("djur", "elefant", "Betar"), ("Djur", "Lejon", "Man")])
    assert added == (0, 1)
    rows = words_in(db)
    assert ("Djur", "Elefant", "Snabel") in rows
    assert ("Djur", "Lejon", "Man") in rows
    assert len(rows) == 7


def test_import_twice_adds_nothing(db):
    rows = [("Djur", "Älg", "Skog")]
    import_words(db, rows)
    assert import_words(db, rows) == (0, 0)


def test_main_fails_on_missing_file(tmp_path, capsys):
    assert main([str(tmp_path / "missing.csv")]) == 1
    assert "not found" in capsys.readouterr().err


def test_main_fails_on_malformed_file(tmp_path, capsys):
    assert main([str(write(tmp_path, "category,word,clue\nDjur,,Skog\n"))]) == 1
    assert ":2:" in capsys.readouterr().err
