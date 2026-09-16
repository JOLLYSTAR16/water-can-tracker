from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.database import Base


class WaterCanStatus(Base):
    __tablename__ = "water_can_status"

    id = Column(
        Integer,
        primary_key=True,
        default=1
    )

    current_turn_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )


class WaterCanHistory(Base):
    __tablename__ = "water_can_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    action = Column(
        String(20),
        nullable=False
    )

    timestamp = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )