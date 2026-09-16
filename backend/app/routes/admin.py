from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.water_can import WaterCanHistory, WaterCanStatus
from app.utils.auth import get_current_user
from app.utils.security import hash_password


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# =========================================================
# ADMIN AUTHORIZATION
# =========================================================

def require_admin(
    current_user: User = Depends(get_current_user)
):
    """
    Allow access only to users with the admin role.
    """

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# =========================================================
# GET ALL USERS
# =========================================================

@router.get("/users")
def get_all_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all users with their water-can statistics.

    Admin accounts are included in the API response,
    but the frontend can exclude them from the
    House Members section.
    """

    users = (
        db.query(User)
        .order_by(User.turn_order.asc())
        .all()
    )

    result = []

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

        result.append(
            {
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "role": user.role,
                "is_active": user.is_active,
                "must_change_password": user.must_change_password,
                "turn_order": user.turn_order,
                "filled": filled_count,
                "absent": absent_count
            }
        )

    return {
        "users": result,
        "total_users": len(result)
    }


# =========================================================
# ADD NEW MEMBER
# =========================================================

@router.post("/users")
def add_new_member(
    name: str,
    username: str,
    password: str,
    turn_order: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new house member.

    The password is hashed before being stored.
    The new member must change the password after
    their first login.
    """

    # -----------------------------------------------------
    # CLEAN INPUT
    # -----------------------------------------------------

    name = name.strip()
    username = username.strip().lower()
    password = password.strip()

    # -----------------------------------------------------
    # VALIDATE INPUT
    # -----------------------------------------------------

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username is required"
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters"
        )

    if turn_order < 1:
        raise HTTPException(
            status_code=400,
            detail="Turn order must be greater than 0"
        )

    # -----------------------------------------------------
    # CHECK DUPLICATE USERNAME
    # -----------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    # -----------------------------------------------------
    # CHECK DUPLICATE TURN ORDER
    # -----------------------------------------------------

    existing_turn = (
        db.query(User)
        .filter(User.turn_order == turn_order)
        .first()
    )

    if existing_turn:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Turn order #{turn_order} "
                "is already assigned to another user"
            )
        )

    # -----------------------------------------------------
    # CREATE MEMBER
    # -----------------------------------------------------

    new_user = User(
        name=name,
        username=username,
        password_hash=hash_password(password),
        role="member",
        is_active=True,
        must_change_password=True,
        turn_order=turn_order
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "message": "New member created successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "username": new_user.username,
            "role": new_user.role,
            "is_active": new_user.is_active,
            "must_change_password": new_user.must_change_password,
            "turn_order": new_user.turn_order
        }
    }


# =========================================================
# RESET USER PASSWORD
# =========================================================

@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Reset a member's password.

    Temporary password:
        username + 123

    The member must change the password
    after logging in.
    """

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=400,
            detail=(
                "Admin passwords cannot be reset "
                "from this endpoint"
            )
        )

    temporary_password = f"{user.username}123"

    user.password_hash = hash_password(
        temporary_password
    )

    user.must_change_password = True

    db.commit()

    return {
        "message": "Password reset successfully",
        "user_id": user.id,
        "username": user.username,
        "temporary_password": temporary_password,
        "must_change_password": True
    }


# =========================================================
# ACTIVATE / DEACTIVATE USER
# =========================================================

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate a member.

    Inactive members are skipped during the
    normal water-can rotation.
    """

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=400,
            detail="Admin accounts cannot be deactivated"
        )

    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account"
        )

    status = (
        db.query(WaterCanStatus)
        .filter(WaterCanStatus.id == 1)
        .first()
    )

    if (
        status
        and status.current_turn_user_id == user.id
        and is_active is False
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "This user currently has the water-can turn. "
                "Change the current turn before "
                "deactivating this user."
            )
        )

    user.is_active = is_active

    db.commit()
    db.refresh(user)

    return {
        "message": (
            "User activated successfully"
            if is_active
            else "User deactivated successfully"
        ),
        "user_id": user.id,
        "name": user.name,
        "username": user.username,
        "is_active": user.is_active
    }


# =========================================================
# CHANGE CURRENT WATER CAN TURN
# =========================================================

@router.patch("/current-turn/{user_id}")
def change_current_turn(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Manually change the current water-can turn.

    The selected user must be:
        - A member
        - Active
        - Present in the database
    """

    selected_user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not selected_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if selected_user.role == "admin":
        raise HTTPException(
            status_code=400,
            detail="Admin cannot be assigned a water-can turn"
        )

    if not selected_user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot assign the turn to an inactive user"
        )

    status = (
        db.query(WaterCanStatus)
        .filter(WaterCanStatus.id == 1)
        .first()
    )

    if not status:
        raise HTTPException(
            status_code=404,
            detail="Water can status not found"
        )

    if status.current_turn_user_id == selected_user.id:
        return {
            "message": (
                "This user already has "
                "the current turn"
            ),
            "current_turn": {
                "id": selected_user.id,
                "name": selected_user.name,
                "username": selected_user.username,
                "turn_order": selected_user.turn_order
            }
        }

    previous_user = (
        db.query(User)
        .filter(
            User.id == status.current_turn_user_id
        )
        .first()
    )

    status.current_turn_user_id = selected_user.id

    db.commit()
    db.refresh(status)

    return {
        "message": "Current turn changed successfully",

        "previous_turn": (
            {
                "id": previous_user.id,
                "name": previous_user.name,
                "username": previous_user.username,
                "turn_order": previous_user.turn_order
            }
            if previous_user
            else None
        ),

        "current_turn": {
            "id": selected_user.id,
            "name": selected_user.name,
            "username": selected_user.username,
            "turn_order": selected_user.turn_order
        }
    }


# =========================================================
# GET CURRENT WATER CAN TURN
# =========================================================

@router.get("/current-turn")
def get_current_turn(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get the current water-can turn.
    """

    status = (
        db.query(WaterCanStatus)
        .filter(WaterCanStatus.id == 1)
        .first()
    )

    if not status:
        raise HTTPException(
            status_code=404,
            detail="Water can status not found"
        )

    current_user = (
        db.query(User)
        .filter(
            User.id == status.current_turn_user_id
        )
        .first()
    )

    if not current_user:
        raise HTTPException(
            status_code=404,
            detail="Current turn user not found"
        )

    return {
        "id": current_user.id,
        "name": current_user.name,
        "username": current_user.username,
        "turn_order": current_user.turn_order
    }


# =========================================================
# GET COMPLETE HISTORY
# =========================================================

@router.get("/history")
def get_all_history(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get the complete water-can history.
    """

    history_records = (
        db.query(WaterCanHistory, User)
        .join(
            User,
            WaterCanHistory.user_id == User.id
        )
        .order_by(
            WaterCanHistory.timestamp.desc()
        )
        .all()
    )

    result = []

    for record, user in history_records:

        result.append(
            {
                "id": record.id,
                "user_id": user.id,
                "name": user.name,
                "username": user.username,
                "action": record.action,
                "timestamp": record.timestamp
            }
        )

    return {
        "history": result,
        "total_records": len(result)
    }


# =========================================================
# CORRECT HISTORY ACTION
# =========================================================

@router.patch("/history/{history_id}")
def correct_history_action(
    history_id: int,
    action: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Correct a history record.

    Allowed actions:

        FILLED
        ABSENT
    """

    action = action.upper().strip()

    if action not in ["FILLED", "ABSENT"]:
        raise HTTPException(
            status_code=400,
            detail="Action must be FILLED or ABSENT"
        )

    history = (
        db.query(WaterCanHistory)
        .filter(
            WaterCanHistory.id == history_id
        )
        .first()
    )

    if not history:
        raise HTTPException(
            status_code=404,
            detail="History record not found"
        )

    old_action = history.action

    history.action = action

    db.commit()
    db.refresh(history)

    user = (
        db.query(User)
        .filter(
            User.id == history.user_id
        )
        .first()
    )

    return {
        "message": (
            "History record corrected successfully"
        ),
        "history_id": history.id,
        "user_id": history.user_id,
        "name": user.name if user else None,
        "username": user.username if user else None,
        "old_action": old_action,
        "new_action": history.action,
        "timestamp": history.timestamp
    }


# =========================================================
# DELETE HISTORY RECORD
# =========================================================

@router.delete("/history/{history_id}")
def delete_history_record(
    history_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a mistaken history record.

    This removes only the history record.
    It does not automatically change the current turn.
    """

    history = (
        db.query(WaterCanHistory)
        .filter(
            WaterCanHistory.id == history_id
        )
        .first()
    )

    if not history:
        raise HTTPException(
            status_code=404,
            detail="History record not found"
        )

    deleted_history_id = history.id
    deleted_user_id = history.user_id
    deleted_action = history.action
    deleted_timestamp = history.timestamp

    db.delete(history)
    db.commit()

    return {
        "message": (
            "History record deleted successfully"
        ),
        "history_id": deleted_history_id,
        "user_id": deleted_user_id,
        "action": deleted_action,
        "timestamp": deleted_timestamp
    }


# =========================================================
# ADMIN DASHBOARD SUMMARY
# =========================================================

@router.get("/summary")
def get_admin_summary(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get the admin dashboard summary.

    Member counts include only users whose role
    is "member". The administrator account is not
    counted as a house member.
    """

    # -----------------------------------------------------
    # MEMBER COUNTS
    # -----------------------------------------------------

    total_users = (
        db.query(User)
        .filter(User.role == "member")
        .count()
    )

    active_users = (
        db.query(User)
        .filter(
            User.role == "member",
            User.is_active == True
        )
        .count()
    )

    inactive_users = (
        db.query(User)
        .filter(
            User.role == "member",
            User.is_active == False
        )
        .count()
    )

    # -----------------------------------------------------
    # WATER CAN COUNTS
    # -----------------------------------------------------

    total_filled = (
        db.query(WaterCanHistory)
        .filter(
            WaterCanHistory.action == "FILLED"
        )
        .count()
    )

    total_absent = (
        db.query(WaterCanHistory)
        .filter(
            WaterCanHistory.action == "ABSENT"
        )
        .count()
    )

    total_records = (
        db.query(WaterCanHistory)
        .count()
    )

    # -----------------------------------------------------
    # CURRENT TURN
    # -----------------------------------------------------

    status = (
        db.query(WaterCanStatus)
        .filter(WaterCanStatus.id == 1)
        .first()
    )

    current_turn = None

    if status:

        current_user = (
            db.query(User)
            .filter(
                User.id == status.current_turn_user_id
            )
            .first()
        )

        if current_user:

            current_turn = {
                "id": current_user.id,
                "name": current_user.name,
                "username": current_user.username,
                "turn_order": current_user.turn_order
            }

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "total_filled": total_filled,
        "total_absent": total_absent,
        "total_records": total_records,
        "current_turn": current_turn
    }