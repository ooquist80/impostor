"""log in with email, display name

Players now register with a unique email (the login) and a display name
instead of a username. Existing accounts are wiped, with their games and
stats, rather than migrated: they have no email to log in with.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-10 15:00:09.771936
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _wipe_players() -> None:
    # game_players references both games and players; games only exist for stats.
    op.execute("DELETE FROM game_players")
    op.execute("DELETE FROM games")
    op.execute("DELETE FROM players")


def upgrade() -> None:
    _wipe_players()
    op.add_column('players', sa.Column('email', sa.String(length=254), nullable=False))
    op.add_column('players', sa.Column('name', sa.String(length=30), nullable=False))
    op.drop_index('username', table_name='players')
    # Same name MariaDB gives the unnamed constraint, so the downgrade can drop it.
    op.create_unique_constraint('email', 'players', ['email'])
    op.drop_column('players', 'username')


def downgrade() -> None:
    # Accounts registered with an email have no username to go back to.
    _wipe_players()
    op.add_column('players', sa.Column('username', mysql.VARCHAR(length=30), nullable=False))
    op.drop_constraint('email', 'players', type_='unique')
    op.create_index('username', 'players', ['username'], unique=True)
    op.drop_column('players', 'name')
    op.drop_column('players', 'email')
