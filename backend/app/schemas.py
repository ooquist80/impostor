from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, model_serializer

Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=30)
]
Password = Annotated[str, Field(min_length=6, max_length=128)]
AvatarColor = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]


# The variants of DiceBear "Clay" (@dicebear/styles clay.json). Top and pattern can be left out.
Body = Literal["pear", "boulder", "loaf", "column", "stack", "gumdrop", "dollop", "slug", "egg", "blob", "bell", "cube", "squat", "lean"]
Eyes = Literal["googly", "even", "big", "tiny", "mono", "trio", "side", "outward", "inward", "dots", "happy", "wink", "down", "up", "pinprick"]
Mouth = Literal["teeth", "smile", "o", "frown", "line", "wavy", "open", "toothy", "tongue", "pout", "grin", "smirk", "zigzag", "dot", "laugh", "cat", "smileBig", "uu", "openSmall", "smileTongue"]
Top = Literal["none", "horns", "nub", "curl", "spikes", "antenna", "loop", "peak", "ears", "crest", "swirl", "pellet", "hornsSmall", "tuft"]
Pattern = Literal["none", "spiral", "prints", "pellets", "buttons", "stitches", "patch", "coil", "freckles", "checker", "zig"]


class Avatar(BaseModel):
    """DiceBear "Clay" options. Unset picks are chosen from the seed."""

    model_config = ConfigDict(extra="forbid")
    seed: Annotated[str, Field(min_length=1, max_length=64)]
    body: Body | None = None
    eyes: Eyes | None = None
    mouth: Mouth | None = None
    top: Top | None = None
    pattern: Pattern | None = None
    bodyColor: AvatarColor | None = None
    backgroundColor: AvatarColor | None = None

    @model_serializer(mode="wrap")
    def _drop_unset(self, handler):
        # Only the picks that are set, the same shape as stored.
        return {k: v for k, v in handler(self).items() if v is not None}


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class WordOut(BaseModel):
    word: str
    clue: str
    category: str


# Public player data, also sent to the game device. Never includes the email.
class PlayerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    avatar: Avatar


class Stats(BaseModel):
    games: int
    wins: int
    total_points: int
    impostor_rounds: int


class RegisterIn(BaseModel):
    email: EmailStr
    name: Name
    password: Password


class LoginIn(BaseModel):
    email: Annotated[str, StringConstraints(strip_whitespace=True)]
    password: str


class AuthOut(BaseModel):
    token: str
    player: PlayerOut


class MeOut(BaseModel):
    player: PlayerOut
    # Only the player's own profile shows the email.
    email: str
    stats: Stats


class MeUpdate(BaseModel):
    avatar: Avatar


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
