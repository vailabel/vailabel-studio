"""
Unified database configuration for both local (SQLite) and cloud (PostgreSQL) deployments
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator


# Environment-based database configuration
class DatabaseConfig:
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "local")
        self.database_url = self._get_database_url()
        self.engine = self._create_engine()
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )

    def _get_database_url(self) -> str:
        """Get database URL based on environment"""
        if self.environment == "cloud":
            # Cloud deployment with PostgreSQL
            return os.getenv(
                "DATABASE_URL", "postgresql://user:password@localhost:5432/vailabel"
            )
        else:
            # Local deployment with SQLite
            db_path = os.getenv("SQLITE_PATH", "./db.sqlite3")
            return f"sqlite:///{db_path}"

    def _create_engine(self):
        """Create database engine with appropriate configuration"""
        if self.environment == "cloud":
            # PostgreSQL configuration
            return create_engine(
                self.database_url,
                pool_pre_ping=True,
                pool_recycle=300,
                echo=os.getenv("SQL_ECHO", "false").lower() == "true",
            )
        else:
            # SQLite configuration for local development
            return create_engine(
                self.database_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
                echo=os.getenv("SQL_ECHO", "false").lower() == "true",
            )

    def get_db(self) -> Generator:
        """Dependency to get database session"""
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()


# Global database configuration instance
db_config = DatabaseConfig()

# Export commonly used items
engine = db_config.engine
SessionLocal = db_config.SessionLocal
get_db = db_config.get_db
