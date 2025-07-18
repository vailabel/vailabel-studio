from fastapi import FastAPI
from api.v1 import (projects, ai_models , annotations, settings, images, labels)
from db.base import Base
from db.session import engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vailabel API",
    description="API for managing annotation projects, labels, images, and more.",
    version="1.0.0",
    contact={
        "name": "Vailabel Team",
        "url": "https://vailabel.com",
        "email": "support@vailabel.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {
            "name": "Projects",
            "description": "Operations on annotation projects"
        },
        {
            "name": "Settings",
            "description": "Operations on application settings"
        },
        {
            "name": "AI Models",
            "description": "Operations on AI models used for annotations"
        },
        {
            "name": "Annotations",
            "description": "Operations on annotations and related data"
        },
    ]
)

# Include all routers
app.include_router(projects.router)
app.include_router(ai_models.router)
app.include_router(annotations.router)
app.include_router(settings.router)
app.include_router(images.router)
app.include_router(labels.router)