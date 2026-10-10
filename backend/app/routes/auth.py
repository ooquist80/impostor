import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import security
from app.deps import get_current_player, get_db
from app.models import GamePlayer, Player
from app.schemas import (
    AuthOut,
    LoginIn,
    MeOut,
    MeUpdate,
    PlayerOut,
    RegisterIn,
    Stats,
)

router = APIRouter(prefix="/api", tags=["auth"])

# Avatar palette from the design (--avatar-1 ... --avatar-5).
AVATAR_COLORS = ["#FFB547", "#8C7BFF", "#3DDC97", "#FF8FB1", "#5CC8FF"]
DEFAULT_EMOJI = "🙂"


@router.post("/auth/register", response_model=AuthOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    taken = HTTPException(409, "Email is already registered")
    email = body.email.lower()
    existing = db.scalar(select(Player.id).where(func.lower(Player.email) == email))
    if existing is not None:
        raise taken
    player = Player(
        email=email,
        name=body.name,
        password_hash=security.hash_password(body.password),
        avatar_emoji=DEFAULT_EMOJI,
        avatar_color=random.choice(AVATAR_COLORS),
    )
    db.add(player)
    try:
        db.commit()
    except IntegrityError:
        # Lost a race with a concurrent registration of the same email.
        db.rollback()
        raise taken
    return AuthOut(token=security.create_auth_token(player.id), player=player)


@router.post("/auth/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    player = db.scalar(
        select(Player).where(func.lower(Player.email) == body.email.lower())
    )
    ok = security.verify_password(
        body.password, player.password_hash if player else None
    )
    if player is None or not ok:
        raise HTTPException(401, "Wrong email or password")
    return AuthOut(token=security.create_auth_token(player.id), player=player)


def _stats(db: Session, player_id: int) -> Stats:
    row = db.execute(
        select(
            func.count(),
            func.coalesce(func.sum(GamePlayer.won), 0),
            func.coalesce(func.sum(GamePlayer.points), 0),
            func.coalesce(func.sum(GamePlayer.impostor_rounds), 0),
        ).where(GamePlayer.player_id == player_id)
    ).one()
    return Stats(
        games=int(row[0]),
        wins=int(row[1]),
        total_points=int(row[2]),
        impostor_rounds=int(row[3]),
    )


@router.get("/me", response_model=MeOut)
def me(player: Player = Depends(get_current_player), db: Session = Depends(get_db)):
    return MeOut(player=player, email=player.email, stats=_stats(db, player.id))


@router.patch("/me", response_model=PlayerOut)
def update_me(
    body: MeUpdate,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    if body.avatar_emoji is not None:
        player.avatar_emoji = body.avatar_emoji
    if body.avatar_color is not None:
        player.avatar_color = body.avatar_color
    db.commit()
    return player
