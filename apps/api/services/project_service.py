from sqlalchemy.orm import Session
from models.project import ProjectCreate, ProjectUpdate
from repositories.project_repository import ProjectRepository


class ProjectService:
    def __init__(self):
        self.repo = ProjectRepository()

    def get_projects(self, db: Session):
        return self.repo.get_all(db)

    def get_project_by_id(self, db: Session, project_id: str):
        return self.repo.get(db, project_id)

    def create_project(self, db: Session, project: ProjectCreate):
        return self.repo.create(db, project)

    def update_project(self, db: Session, project_id: str, updates: ProjectUpdate):
        return self.repo.update(db, project_id, updates)

    def delete_project(self, db: Session, project_id: str):
        return self.repo.delete(db, project_id)


def get_project_service():
    return ProjectService()
