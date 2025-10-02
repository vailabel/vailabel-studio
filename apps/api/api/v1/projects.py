from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.project_service import ProjectService, get_project_service
from models.project import Project, ProjectCreate, ProjectUpdate
from api.v1.auth import require_permission, get_current_active_user
from models.user import User

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.get("/", response_model=list[Project])
def list_projects(
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("projects:read")),
):
    """
    Retrieve all projects for the current user.

    Args:
        db: Database session dependency
        service: Project service dependency
        current_user: Current authenticated user

    Returns:
        List of all projects for the current user
    """
    return service.get_projects_by_user(db, current_user.id)


@router.get("/{project_id}", response_model=Project)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
    _: None = Depends(require_permission("projects:read")),
):
    """
    Retrieve a specific project by its ID.

    Args:
        project_id: The unique identifier of the project
        db: Database session dependency
        service: Project service dependency

    Returns:
        The requested project object

    Raises:
        HTTPException: 404 error if the project is not found
    """
    project = service.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", response_model=Project)
def create(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
    current_user: User = Depends(get_current_active_user),
    _: None = Depends(require_permission("projects:write")),
):
    """
    Create a new project.

    Args:
        project: The data for creating a new project
        db: Database session dependency
        service: Project service dependency
        current_user: Current authenticated user

    Returns:
        The newly created project object
    """
    # Set the user_id to the current user
    project.user_id = current_user.id
    return service.create_project(db, project)


@router.put("/{project_id}", response_model=Project)
def update(
    project_id: str,
    updates: ProjectUpdate,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
    _: None = Depends(require_permission("projects:write")),
):
    """
    Update an existing project.

    Args:
        project_id: The unique identifier of the project to update
        updates: The data for updating the project
        db: Database session dependency
        service: Project service dependency

    Returns:
        The updated project object

    Raises:
        HTTPException: 404 error if the project is not found
    """
    updated = service.update_project(db, project_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated


@router.delete("/{project_id}")
def delete(
    project_id: str,
    db: Session = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
    _: None = Depends(require_permission("projects:delete")),
):
    """
    Delete a project by its ID.

    Args:
        project_id: The unique identifier of the project to delete
        db: Database session dependency
        service: Project service dependency

    Returns:
        Success message confirming deletion

    Raises:
        HTTPException: 404 error if the project is not found
    """
    deleted = service.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}
