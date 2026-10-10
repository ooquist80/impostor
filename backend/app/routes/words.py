from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Category, Word
from app.schemas import CategoryOut, WordOut

router = APIRouter(prefix="/api", tags=["words"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.id)).all()


@router.get("/words/random", response_model=WordOut)
def random_word(
    category_id: Annotated[list[int] | None, Query()] = None,
    db: Session = Depends(get_db),
):
    query = select(Word, Category.name).join(Category, Word.category_id == Category.id)
    if category_id:
        query = query.where(Word.category_id.in_(category_id))
    # RAND() exists only in MariaDB/MySQL, random() in SQLite.
    random_fn = func.random() if db.get_bind().dialect.name == "sqlite" else func.rand()
    row = db.execute(query.order_by(random_fn).limit(1)).first()
    if row is None:
        raise HTTPException(404, "No word found")
    word, category_name = row
    return WordOut(word=word.word, clue=word.clue, category=category_name)
