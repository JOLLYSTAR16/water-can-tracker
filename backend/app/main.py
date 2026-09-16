from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import User
from app.models.water_can import WaterCanStatus

from app.routes.auth import router as auth_router
from app.routes.water_can import router as water_can_router
from app.routes.admin import router as admin_router


# Create database tables
Base.metadata.create_all(bind=engine)


def initialize_water_can():
    db = SessionLocal()

    try:
        status = (
            db.query(WaterCanStatus)
            .filter(
                WaterCanStatus.id == 1
            )
            .first()
        )

        if not status:

            first_member = (
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

            if first_member:

                status = WaterCanStatus(
                    id=1,
                    current_turn_user_id=first_member.id
                )

                db.add(status)
                db.commit()

    finally:
        db.close()


initialize_water_can()


app = FastAPI(
    title="Water Can Tracker API",
    description="Backend API for the Water Can Turn Tracker",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,

    # Development setting.
    # This will be restricted to the live frontend
    # domain before production deployment.
    allow_origins=["*"],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


app.include_router(auth_router)
app.include_router(water_can_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {
        "message": "Water Can Tracker API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }