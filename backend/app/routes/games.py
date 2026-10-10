from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import security
from app.deps import get_db
from app.models import Game, GamePlayer, Player
from app.schemas import GameIn, GameOut

router = APIRouter(prefix="/api", tags=["games"])


@router.post("/games", response_model=GameOut, status_code=201)
def save_game(body: GameIn, db: Session = Depends(get_db)):
    if not body.players:
        raise HTTPException(400, "No players")
    rows: list[GamePlayer] = []
    seen: set[int] = set()
    for entry in body.players:
        player_id = security.verify_token(entry.participant_token, security.PARTICIPANT)
        if player_id is None or db.get(Player, player_id) is None:
            raise HTTPException(400, "Invalid participant token")
        if player_id in seen:
            raise HTTPException(400, "Duplicate player")
        seen.add(player_id)
        rows.append(
            GamePlayer(
                player_id=player_id,
                points=entry.points,
                impostor_rounds=entry.impostor_rounds,
                won=entry.won,
            )
        )
    game = Game(rounds=body.rounds)
    db.add(game)
    db.flush()
    for row in rows:
        row.game_id = game.id
        db.add(row)
    db.commit()
    return GameOut(id=game.id)
