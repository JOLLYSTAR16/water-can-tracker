from datetime import datetime

from pydantic import BaseModel


class WaterCanActionRequest(BaseModel):
    action: str


class CurrentTurnResponse(BaseModel):
    id: int
    name: str
    username: str
    turn_order: int


class HistoryResponse(BaseModel):
    id: int
    name: str
    username: str
    action: str
    timestamp: datetime


class MemberStats(BaseModel):
    name: str
    username: str
    filled: int
    absent: int


class WaterCanStatusResponse(BaseModel):
    current_turn: CurrentTurnResponse
    history: list[HistoryResponse]
    stats: list[MemberStats]
    total_turns: int