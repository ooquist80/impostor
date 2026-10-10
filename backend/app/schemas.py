from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Username = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=30)
]
Password = Annotated[str, Field(min_length=6, max_length=128)]
AvatarEmoji = Annotated[str, Field(min_length=1, max_length=8)]
AvatarColor = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class WordOut(BaseModel):
    word: str
    clue: str
    category: str


class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    avatar_emoji: str
    avatar_color: str


class Stats(BaseModel):
    games: int
    wins: int
    total_points: int
    impostor_rounds: int


class RegisterIn(BaseModel):
    username: Username
    password: Password


class LoginIn(BaseModel):
    username: Annotated[str, StringConstraints(strip_whitespace=True)]
    password: str


class AuthOut(BaseModel):
    token: str
    player: PlayerOut


class MeOut(BaseModel):
    player: PlayerOut
    stats: Stats


class MeUpdate(BaseModel):
    avatar_emoji: AvatarEmoji | None = None
    avatar_color: AvatarColor | None = None


class JoinTokenOut(BaseModel):
    token: str
    expires_at: datetime


class RedeemIn(BaseModel):
    token: str


class RedeemOut(BaseModel):
    player: PlayerOut
    participant_token: str


class GamePlayerIn(BaseModel):
    participant_token: str
    points: Annotated[int, Field(ge=0)]
    impostor_rounds: Annotated[int, Field(ge=0)]
    won: bool


class GameIn(BaseModel):
    rounds: Annotated[int, Field(ge=1)]
    players: list[GamePlayerIn]


class GameOut(BaseModel):
    id: int
