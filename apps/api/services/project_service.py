from sqlalchemy.orm import Session
from models.project import ProjectCreate, ProjectUpdate
from repositories.project_repository import ProjectRepository

project_repo = ProjectRepository()


def get_projects(db: Session):
    return project_repo.get_all(db)


def get_project_by_id(db: Session, project_id: str):
    return project_repo.get(db, project_id)


def create_project(db: Session, project: ProjectCreate):
    return project_repo.create(db, project)


def update_project(db: Session, project_id: str, updates: ProjectUpdate):
    return project_repo.update(db, project_id, updates)


def delete_project(db: Session, project_id: str):
    return project_repo.delete(db, project_id)
