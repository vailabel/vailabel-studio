from sqlalchemy.orm import Session
from models.project import ProjectCreate, ProjectUpdate
from repositories.project_repository import ProjectRepository


class ProjectService:
    def __init__(self):
        self.db = None
        self.repo = ProjectRepository()

    def set_db(self, db: Session):
        self.db = db

    def get_projects(self):
        return self.repo.get_all(self.db)

    def get_project_by_id(self, project_id: str):
        return self.repo.get(self.db, project_id)

    def create_project(self, project: ProjectCreate):
        return self.repo.create(self.db, project)

    def update_project(self, project_id: str, updates: ProjectUpdate):
        return self.repo.update(self.db, project_id, updates)

    def delete_project(self, project_id: str):
        return self.repo.delete(self.db, project_id)


project_service = ProjectService()
