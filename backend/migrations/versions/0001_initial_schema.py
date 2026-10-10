"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_OPTIONS = {
    "mariadb_charset": "utf8mb4",
    "mariadb_collate": "utf8mb4_uca1400_swedish_ai_ci",
}


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        **TABLE_OPTIONS,
    )
    op.create_table(
        "words",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("word", sa.String(length=100), nullable=False),
        sa.Column("clue", sa.String(length=100), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_OPTIONS,
    )
    op.create_table(
        "players",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=30), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("avatar_emoji", sa.String(length=8), nullable=False),
        sa.Column("avatar_color", sa.CHAR(length=7), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(now())"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        **TABLE_OPTIONS,
    )
    op.create_table(
        "games",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "finished_at",
            sa.DateTime(),
            server_default=sa.text("(now())"),
            nullable=False,
        ),
        sa.Column("rounds", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_OPTIONS,
    )
    op.create_table(
        "game_players",
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("impostor_rounds", sa.Integer(), nullable=False),
        sa.Column("won", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("game_id", "player_id"),
        **TABLE_OPTIONS,
    )


def downgrade() -> None:
    op.drop_table("game_players")
    op.drop_table("games")
    op.drop_table("players")
    op.drop_table("words")
    op.drop_table("categories")
