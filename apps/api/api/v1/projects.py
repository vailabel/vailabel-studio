from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.project_service import ProjectService, get_project_service
from models.project import Project, ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.get("/", response_model=list[Project])
def list_projects(
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
):
    return service.get_projects(db)


@router.get("/{project_id}", response_model=Project)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
):
    project = service.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", response_model=Project)
def create(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
):
    return service.create_project(db, project)


@router.put("/{project_id}", response_model=Project)
def update(
    project_id: str,
    updates: ProjectUpdate,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
):
    updated = service.update_project(db, project_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated


@router.delete("/{project_id}")
def delete(
    project_id: str,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
):
    deleted = service.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}
