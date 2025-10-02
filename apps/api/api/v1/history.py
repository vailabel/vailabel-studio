from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.history_service import HistoryService, get_history_service
from models.history import History, HistoryCreate, HistoryUpdate

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("/project/{project_id}", response_model=list[History])
def get_project_history(
    project_id: str,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
):
    """
    Retrieve all history records associated with a specific project.
    
    Args:
        project_id: The unique identifier of the project
        db: Database session dependency
        service: History service dependency
    
    Returns:
        List of history records belonging to the project
    """
    return service.get_history_by_project(db, project_id)


@router.post("/", response_model=History)
def create_history(
    data: HistoryCreate,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
):
    """
    Create a new history record.
    
    Args:
        data: The data for creating a new history record
        db: Database session dependency
        service: History service dependency
    
    Returns:
        The newly created history record object
    """
    return service.create_history(db, data)


@router.put("/{history_id}", response_model=History)
def update_history(
    history_id: str,
    data: HistoryUpdate,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
):
    """
    Update an existing history record.
    
    Args:
        history_id: The unique identifier of the history record to update
        data: The data for updating the history record
        db: Database session dependency
        service: History service dependency
    
    Returns:
        The updated history record object
    
    Raises:
        HTTPException: 404 error if the history record is not found
    """
    updated = service.update_history(db, history_id, data)
    if not updated:
        raise HTTPException(404, "History not found")
    return updated


@router.delete("/{history_id}")
def delete_history(
    history_id: str,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
):
    """
    Delete a history record by its ID.
    
    Args:
        history_id: The unique identifier of the history record to delete
        db: Database session dependency
        service: History service dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the history record is not found
    """
    deleted = service.delete_history(db, history_id)
    if not deleted:
        raise HTTPException(404, "History not found")
    return {"message": "History deleted"}