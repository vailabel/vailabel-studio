from sqlalchemy.orm import Session
from typing import List
from db.models.project import Project as ProjectModel
from models.project import ProjectCreate, ProjectUpdate
from repositories.base_repository import BaseRepository


class ProjectRepository(BaseRepository):
    def __init__(self):
        super().__init__(ProjectModel)

    def get_by_user(self, db: Session, user_id: str) -> List[ProjectModel]:
        """Get all projects for a specific user"""
        return db.query(self.model).filter(self.model.user_id == user_id).all()
