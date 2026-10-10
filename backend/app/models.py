from datetime import datetime

from sqlalchemy import (
    CHAR,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

TABLE_OPTIONS = {
    "mariadb_charset": "utf8mb4",
    "mariadb_collate": "utf8mb4_uca1400_swedish_ai_ci",
}


class Base(DeclarativeBase):
    pass


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = TABLE_OPTIONS

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    words: Mapped[list["Word"]] = relationship(back_populates="category")


class Word(Base):
    __tablename__ = "words"
    __table_args__ = TABLE_OPTIONS

    id: Mapped[int] = mapped_column(primary_key=True)
    word: Mapped[str] = mapped_column(String(100))
    clue: Mapped[str] = mapped_column(String(100))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))

    category: Mapped[Category] = relationship(back_populates="words")


class Player(Base):
    __tablename__ = "players"
    __table_args__ = TABLE_OPTIONS

    id: Mapped[int] = mapped_column(primary_key=True)
    # Login. Stored lower-cased; UNIQUE also uses the case-insensitive collation.
    # Shown only on the player's own profile, never in games.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    # Display name in games. Not unique.
    name: Mapped[str] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar_emoji: Mapped[str] = mapped_column(String(8), default="🙂")
    avatar_color: Mapped[str] = mapped_column(CHAR(7))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Game(Base):
    __tablename__ = "games"
    __table_args__ = TABLE_OPTIONS

    id: Mapped[int] = mapped_column(primary_key=True)
    finished_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    rounds: Mapped[int] = mapped_column(Integer)


class GamePlayer(Base):
    __tablename__ = "game_players"
    __table_args__ = TABLE_OPTIONS

    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id"), primary_key=True
    )
    player_id: Mapped[int] = mapped_column(
        ForeignKey("players.id"), primary_key=True
    )
    points: Mapped[int] = mapped_column(Integer)
    impostor_rounds: Mapped[int] = mapped_column(Integer)
    won: Mapped[bool] = mapped_column(Boolean)
