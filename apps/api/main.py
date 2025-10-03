from fastapi import FastAPI
from api.v1 import (
    projects,
    ai_models,
    annotations,
    settings,
    images,
    labels,
    tasks,
    history,
    users,
    auth,
    oauth,
    sync,
    permissions,
)
from db.base import Base
from config.database import engine
from config.settings import settings as app_settings

# Import all models to ensure they are registered with SQLAlchemy
import db.models
from exception_handlers import register_exception_handlers
from openapi_config import openapi_config
from fastapi.middleware.cors import CORSMiddleware
import os
import sys


# Create tables
Base.metadata.create_all(bind=engine)


def check_and_seed_database():
    """Check if database needs seeding and run it if necessary"""
    try:
        from db.session import get_db
        from db.models.user import User
        from db.models.permission import Permission

        # Check if we should run seeding
        should_seed = os.getenv("AUTO_SEED", "true").lower() == "true"

        if not should_seed:
            print("⏭️  Skipping automatic seeding (AUTO_SEED=false)")
            return

        # Check if database already has data
        db = next(get_db())
        try:
            # Check if admin user exists
            admin_user = (
                db.query(User).filter(User.email == "admin@example.com").first()
            )
            # Check if permissions exist
            permission_count = db.query(Permission).count()

            if admin_user and permission_count > 0:
                print("✅ Database already seeded, skipping...")
                return

        finally:
            db.close()

        print("🌱 Database appears empty, running automatic seeding...")

        # Import and run seeding
        from scripts.seed_all import main as seed_main

        seed_main()

        print("✅ Database seeding completed!")

    except Exception as e:
        print(f"⚠️  Warning: Automatic seeding failed: {e}")
        print("💡 You can run manual seeding with: python scripts/seed_all.py")


app = FastAPI(**openapi_config)


@app.on_event("startup")
async def startup_event():
    """Run database seeding on startup"""
    check_and_seed_database()


app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Register exception handlers
register_exception_handlers(app)

# Include all routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(ai_models.router)
app.include_router(annotations.router)
app.include_router(settings.router)
app.include_router(images.router)
app.include_router(labels.router)
app.include_router(tasks.router)
app.include_router(history.router)
app.include_router(permissions.router)
app.include_router(oauth.social_router)
app.include_router(sync.router, prefix="/api/v1", tags=["sync"])
