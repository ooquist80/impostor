"""clay avatars

Avatars switch from DiceBear "Thumbs" to "Clay". The editor picks have
different names, so only the seed is kept: every player gets a Clay avatar
drawn from their seed and can pick again on their profile.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-10 19:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

KEEP_SEED = "UPDATE players SET avatar = JSON_OBJECT('seed', JSON_VALUE(avatar, '$.seed'))"


def upgrade() -> None:
    op.execute(KEEP_SEED)


def downgrade() -> None:
    # Clay picks mean nothing to Thumbs either.
    op.execute(KEEP_SEED)
