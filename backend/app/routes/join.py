from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import security
from app.deps import get_current_player, get_db
from app.models import Player
from app.schemas import JoinTokenOut, RedeemIn, RedeemOut

router = APIRouter(prefix="/api", tags=["join"])


@router.post("/join-tokens", response_model=JoinTokenOut)
def issue_join_token(player: Player = Depends(get_current_player)):
    token, expires_at = security.create_join_token(player.id)
    return JoinTokenOut(token=token, expires_at=expires_at)


@router.post("/join-tokens/redeem", response_model=RedeemOut)
def redeem_join_token(body: RedeemIn, db: Session = Depends(get_db)):
    player_id = security.verify_token(body.token, security.JOIN)
    player = db.get(Player, player_id) if player_id is not None else None
    if player is None:
        raise HTTPException(400, "Invalid or expired token")
    return RedeemOut(
        player=player,
        participant_token=security.create_participant_token(player.id),
    )
