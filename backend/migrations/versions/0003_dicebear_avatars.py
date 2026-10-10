"""dicebear avatars

Replaces the emoji + colour avatar with DiceBear "Thumbs" options stored as
JSON ({"seed": ..., plus optional editor picks}). Existing players keep their
account and get an avatar seeded from their id.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-10 15:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('players', sa.Column('avatar', sa.JSON(), nullable=True))
    op.execute("UPDATE players SET avatar = JSON_OBJECT('seed', CONCAT('player-', id))")
    op.alter_column('players', 'avatar', existing_type=sa.JSON(), nullable=False)
    op.drop_column('players', 'avatar_emoji')
    op.drop_column('players', 'avatar_color')


def downgrade() -> None:
    # Editor picks can't be expressed as an emoji; everyone gets the old defaults.
    op.add_column('players', sa.Column('avatar_color', mysql.CHAR(length=7), nullable=False, server_default='#FFB547'))
    op.add_column('players', sa.Column('avatar_emoji', mysql.VARCHAR(length=8), nullable=False, server_default='🙂'))
    op.alter_column('players', 'avatar_color', existing_type=mysql.CHAR(length=7), server_default=None)
    op.alter_column('players', 'avatar_emoji', existing_type=mysql.VARCHAR(length=8), server_default=None)
    op.drop_column('players', 'avatar')
