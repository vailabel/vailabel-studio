from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.label_service import LabelService, get_label_service
from models.label import Label, LabelCreate, LabelUpdate
from api.v1.auth import require_permission
from services.auth_service import get_current_active_user
from db.models.user import User

router = APIRouter(prefix="/api/v1/labels", tags=["Labels"])


@router.get("/project/{project_id}", response_model=list[Label])
def get_by_project(
    project_id: str,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
    _: User = Depends(require_permission("labels:read")),
):
    """
    Retrieve all labels associated with a specific project.
    
    Args:
        project_id: The unique identifier of the project
        db: Database session dependency
        service: Label service dependency
    
    Returns:
        List of labels belonging to the project
    """
    return service.get_labels_by_project(db, project_id)


@router.post("/", response_model=Label)
def create(
    data: LabelCreate,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
    _: User = Depends(require_permission("labels:write")),
):
    """
    Create a new label.
    
    Args:
        data: The data for creating a new label
        db: Database session dependency
        service: Label service dependency
    
    Returns:
        The newly created label object
    """
    return service.create_label(db, data)


@router.put("/{label_id}", response_model=Label)
def update(
    label_id: str,
    data: LabelUpdate,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
    _: User = Depends(require_permission("labels:write")),
):
    """
    Update an existing label.
    
    Args:
        label_id: The unique identifier of the label to update
        data: The data for updating the label
        db: Database session dependency
        service: Label service dependency
    
    Returns:
        The updated label object
    
    Raises:
        HTTPException: 404 error if the label is not found
    """
    updated = service.update_label(db, label_id, data)
    if not updated:
        raise HTTPException(404, "Label not found")
    return updated


@router.delete("/{label_id}")
def delete(
    label_id: str,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
    _: User = Depends(require_permission("labels:delete")),
):
    """
    Delete a label by its ID.
    
    Args:
        label_id: The unique identifier of the label to delete
        db: Database session dependency
        service: Label service dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the label is not found
    """
    deleted = service.delete_label(db, label_id)
    if not deleted:
        raise HTTPException(404, "Label not found")
    return {"message": "Label deleted"}