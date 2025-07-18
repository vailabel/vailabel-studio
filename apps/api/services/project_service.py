from sqlalchemy.orm import Session
from db.models.project import Project as ProjectModel
from models.project import ProjectCreate, ProjectUpdate

def get_projects(db: Session):
    return db.query(ProjectModel).all()

def get_project_by_id(db: Session, project_id: str):
    return db.query(ProjectModel).filter(ProjectModel.id == project_id).first()

def create_project(db: Session, project: ProjectCreate):
    db_project = ProjectModel(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: str, updates: ProjectUpdate):
    project = get_project_by_id(db, project_id)
    if not project:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project

def delete_project(db: Session, project_id: str):
    project = get_project_by_id(db, project_id)
    if project:
        db.delete(project)
        db.commit()
    return project
