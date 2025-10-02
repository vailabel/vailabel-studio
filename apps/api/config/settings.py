"""
Application settings and configuration
"""

import os
from typing import List, Optional


class Settings:
    # Application
    APP_NAME: str = "Vailabel Studio API"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "local")  # local, cloud, development

    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "./db.sqlite3")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # CORS
    CORS_ORIGINS: List[str] = [
        "https://studio.vailabel.app",
        "http://localhost:5173",  # local dev
        "http://localhost:3000",  # electron dev
        "http://127.0.0.1:3000",  # electron dev
    ]

    # OAuth
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # Cloud Sync
    CLOUD_SYNC_ENABLED: bool = (
        os.getenv("CLOUD_SYNC_ENABLED", "false").lower() == "true"
    )
    CLOUD_API_URL: str = os.getenv("CLOUD_API_URL", "https://api.vailabel.app")

    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB

    # AI Models
    AI_MODELS_DIR: str = os.getenv("AI_MODELS_DIR", "./ai_models")

    @classmethod
    def is_local(cls) -> bool:
        return cls.ENVIRONMENT == "local"

    @classmethod
    def is_cloud(cls) -> bool:
        return cls.ENVIRONMENT == "cloud"

    @classmethod
    def is_development(cls) -> bool:
        return cls.ENVIRONMENT == "development"


settings = Settings()
