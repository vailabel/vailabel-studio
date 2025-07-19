from fastapi import FastAPI
from api.v1 import (projects, ai_models , annotations, settings, images, labels, tasks, history, users)
from db.base import Base
from db.session import engine
from exception_handlers import register_exception_handlers
from openapi_config import openapi_config
from fastapi.middleware.cors import CORSMiddleware


# Create tables
Base.metadata.create_all(bind=engine)


app = FastAPI(**openapi_config)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://studio.vailabel.app",
        "http://localhost:5173",  # local dev
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Register exception handlers
register_exception_handlers(app)

# Include all routers
app.include_router(projects.router)
app.include_router(ai_models.router)
app.include_router(annotations.router)
app.include_router(settings.router)
app.include_router(images.router)
app.include_router(labels.router)
app.include_router(tasks.router)
app.include_router(history.router)
app.include_router(users.router)
