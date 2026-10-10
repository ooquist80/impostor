import secrets

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



def new_avatar() -> dict:
    """A random seed and no picks: the app draws a Thumbs avatar from the seed."""
    return {"seed": secrets.token_hex(8)}


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
        avatar=new_avatar(),
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
    player.avatar = body.avatar.model_dump(exclude_none=True)
    db.commit()
    return player
