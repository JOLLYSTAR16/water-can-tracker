from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password


db = SessionLocal()


try:

    # -----------------------------------------------------
    # CHECK WHETHER ADMIN ALREADY EXISTS
    # -----------------------------------------------------

    existing_admin = (
        db.query(User)
        .filter(User.username == "admin")
        .first()
    )

    if existing_admin:

        print("Admin account already exists.")

        print(f"Username: {existing_admin.username}")
        print(f"Role: {existing_admin.role}")

    else:

        # -------------------------------------------------
        # CREATE ADMIN
        # -------------------------------------------------

        admin = User(
            name="Administrator",
            username="admin",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True,
            must_change_password=True,
            turn_order=999
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("Admin account created successfully.")
        print()
        print("Username: admin")
        print("Default Password: admin123")
        print("Role: admin")


finally:

    db.close()