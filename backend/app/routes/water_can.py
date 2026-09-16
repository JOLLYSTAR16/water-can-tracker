from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.water_can import WaterCanHistory, WaterCanStatus
from app.schemas.water_can import (
    CurrentTurnResponse,
    HistoryResponse,
    MemberStats,
    WaterCanActionRequest,
    WaterCanStatusResponse
)
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/water-can",
    tags=["Water Can"]
)


# =========================================================
# GET OR CREATE WATER CAN STATUS
# =========================================================

def get_or_create_status(db: Session):
    """
    Get the current water-can status.

    Only active members can be part of the rotation.
    Admin accounts are never included.
    """

    status = (
        db.query(WaterCanStatus)
        .filter(WaterCanStatus.id == 1)
        .first()
    )

    if status:

        # -------------------------------------------------
        # Make sure the current turn is still a valid member
        # -------------------------------------------------

        current_user = (
            db.query(User)
            .filter(
                User.id == status.current_turn_user_id
            )
            .first()
        )

        if (
            current_user
            and current_user.role == "member"
            and current_user.is_active
        ):
            return status

        # -------------------------------------------------
        # Current user is invalid/inactive/admin.
        # Find the first active member.
        # -------------------------------------------------

        first_member = (
            db.query(User)
            .filter(
                User.role == "member",
                User.is_active == True
            )
            .order_by(User.turn_order.asc())
            .first()
        )

        if not first_member:
            raise HTTPException(
                status_code=500,
                detail="No active members found in the database"
            )

        status.current_turn_user_id = first_member.id

        db.commit()
        db.refresh(status)

        return status

    # =====================================================
    # CREATE INITIAL STATUS
    # =====================================================

    first_member = (
        db.query(User)
        .filter(
            User.role == "member",
            User.is_active == True
        )
        .order_by(User.turn_order.asc())
        .first()
    )

    if not first_member:
        raise HTTPException(
            status_code=500,
            detail="No active members found in the database"
        )

    status = WaterCanStatus(
        id=1,
        current_turn_user_id=first_member.id
    )

    db.add(status)
    db.commit()
    db.refresh(status)

    return status


# =========================================================
# GET WATER CAN STATUS
# =========================================================

@router.get(
    "/status",
    response_model=WaterCanStatusResponse
)
def get_water_can_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    status = get_or_create_status(db)

    # -----------------------------------------------------
    # CURRENT TURN USER
    # -----------------------------------------------------

    current_turn = (
        db.query(User)
        .filter(
            User.id == status.current_turn_user_id,
            User.role == "member",
            User.is_active == True
        )
        .first()
    )

    if not current_turn:
        raise HTTPException(
            status_code=500,
            detail="Current turn member not found"
        )

    # =====================================================
    # HISTORY
    # =====================================================

    history_records = (
        db.query(WaterCanHistory, User)
        .join(
            User,
            WaterCanHistory.user_id == User.id
        )
        .order_by(
            WaterCanHistory.timestamp.desc()
        )
        .limit(20)
        .all()
    )

    history = []

    for record, user in history_records:

        # -------------------------------------------------
        # History belonging to an admin should not appear
        # on the normal member dashboard.
        # -------------------------------------------------

        if user.role != "member":
            continue

        history.append(
            HistoryResponse(
                id=record.id,
                name=user.name,
                username=user.username,
                action=record.action,
                timestamp=record.timestamp
            )
        )

    # =====================================================
    # MEMBER STATISTICS
    # =====================================================

    users = (
        db.query(User)
        .filter(
            User.role == "member",
            User.is_active == True
        )
        .order_by(
            User.turn_order.asc()
        )
        .all()
    )

    stats = []

    for user in users:

        filled_count = (
            db.query(WaterCanHistory)
            .filter(
                WaterCanHistory.user_id == user.id,
                WaterCanHistory.action == "FILLED"
            )
            .count()
        )

        absent_count = (
            db.query(WaterCanHistory)
            .filter(
                WaterCanHistory.user_id == user.id,
                WaterCanHistory.action == "ABSENT"
            )
            .count()
        )

        stats.append(
            MemberStats(
                name=user.name,
                username=user.username,
                filled=filled_count,
                absent=absent_count
            )
        )

    # =====================================================
    # TOTAL TURNS
    # =====================================================

    total_turns = (
        db.query(WaterCanHistory)
        .join(
            User,
            WaterCanHistory.user_id == User.id
        )
        .filter(
            User.role == "member"
        )
        .count()
    )

    # =====================================================
    # RESPONSE
    # =====================================================

    return WaterCanStatusResponse(
        current_turn=CurrentTurnResponse(
            id=current_turn.id,
            name=current_turn.name,
            username=current_turn.username,
            turn_order=current_turn.turn_order
        ),
        history=history,
        stats=stats,
        total_turns=total_turns
    )


# =========================================================
# WATER CAN ACTION
# =========================================================

@router.post("/action")
def water_can_action(
    data: WaterCanActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # Only members can perform water-can actions.
    # -----------------------------------------------------

    if current_user.role != "member":
        raise HTTPException(
            status_code=403,
            detail="Only house members can perform water-can actions"
        )

    action = data.action.upper().strip()

    if action not in ["FILLED", "ABSENT"]:
        raise HTTPException(
            status_code=400,
            detail="Action must be FILLED or ABSENT"
        )

    # =====================================================
    # GET CURRENT STATUS
    # =====================================================

    status = get_or_create_status(db)

    # =====================================================
    # CHECK CURRENT TURN
    # =====================================================

    if status.current_turn_user_id != current_user.id:

        current_turn = (
            db.query(User)
            .filter(
                User.id == status.current_turn_user_id,
                User.role == "member"
            )
            .first()
        )

        current_name = (
            current_turn.name
            if current_turn
            else "another member"
        )

        raise HTTPException(
            status_code=403,
            detail=(
                f"It is currently "
                f"{current_name}'s turn"
            )
        )

    # =====================================================
    # CREATE HISTORY RECORD
    # =====================================================

    history = WaterCanHistory(
        user_id=current_user.id,
        action=action
    )

    db.add(history)

    # =====================================================
    # FIND NEXT ACTIVE MEMBER
    # =====================================================

    next_user = (
        db.query(User)
        .filter(
            User.role == "member",
            User.is_active == True,
            User.turn_order > current_user.turn_order
        )
        .order_by(
            User.turn_order.asc()
        )
        .first()
    )

    # -----------------------------------------------------
    # If there is no member after the current member,
    # start again from the first active member.
    # -----------------------------------------------------

    if not next_user:

        next_user = (
            db.query(User)
            .filter(
                User.role == "member",
                User.is_active == True
            )
            .order_by(
                User.turn_order.asc()
            )
            .first()
        )

    if not next_user:

        raise HTTPException(
            status_code=500,
            detail="No active members available"
        )

    # =====================================================
    # MOVE TURN
    # =====================================================

    status.current_turn_user_id = next_user.id

    db.commit()

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "message": (
            "Water can marked as filled."
            if action == "FILLED"
            else "Turn marked as absent."
        ),
        "action": action,
        "completed_by": current_user.name,
        "next_turn": next_user.name
    }