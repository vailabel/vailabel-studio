from fastapi import APIRouter, Depends, HTTPException
from models.project import Project, ProjectCreate, ProjectUpdate
from services.dependencies import get_project_service

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.get("/", response_model=list[Project])
def list_projects(project_service=Depends(get_project_service)):
    return project_service.get_projects()


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str, project_service=Depends(get_project_service)):
    project = project_service.get_project_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", response_model=Project)
def create(project: ProjectCreate, project_service=Depends(get_project_service)):
    return project_service.create_project(project)


@router.put("/{project_id}", response_model=Project)
def update(
    project_id: str,
    updates: ProjectUpdate,
    project_service=Depends(get_project_service),
):
    updated = project_service.update_project(project_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated


@router.delete("/{project_id}")
def delete(project_id: str, project_service=Depends(get_project_service)):
    deleted = project_service.delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}
