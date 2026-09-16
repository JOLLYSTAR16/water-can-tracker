from app.database import Base, SessionLocal, engine
from app.models.user import User
from app.utils.security import hash_password


# Create all database tables
Base.metadata.create_all(bind=engine)


def create_initial_users():
    db = SessionLocal()

    users = [
        {
            "name": "Akshai",
            "username": "akshai",
            "password": "akshai123",
            "turn_order": 1,
        },
        {
            "name": "Muruganand",
            "username": "muruganand",
            "password": "muruganand123",
            "turn_order": 2,
        },
        {
            "name": "Pranav",
            "username": "pranav",
            "password": "pranav123",
            "turn_order": 3,
        },
        {
            "name": "Rishab",
            "username": "rishab",
            "password": "rishab123",
            "turn_order": 4,
        },
    ]

    try:
        for user_data in users:

            existing_user = db.query(User).filter(
                User.username == user_data["username"]
            ).first()

            if existing_user:
                print(
                    f"{user_data['name']} already exists. Skipping."
                )
                continue

            user = User(
                name=user_data["name"],
                username=user_data["username"],
                password_hash=hash_password(
                    user_data["password"]
                ),
                role="member",
                is_active=True,
                must_change_password=True,
                turn_order=user_data["turn_order"],
            )

            db.add(user)

        db.commit()

        print()
        print("======================================")
        print(" Initial users created successfully!")
        print("======================================")
        print()
        print("1. Akshai")
        print("   Username: akshai")
        print("   Password: akshai123")
        print()
        print("2. Muruganand")
        print("   Username: muruganand")
        print("   Password: muruganand123")
        print()
        print("3. Pranav")
        print("   Username: pranav")
        print("   Password: pranav123")
        print()
        print("4. Rishab")
        print("   Username: rishab")
        print("   Password: rishab123")
        print()
        print("All users must change their password")
        print("during their first login.")
        print()

    finally:
        db.close()


if __name__ == "__main__":
    create_initial_users()