from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.history_service import HistoryService, get_history_service
from models.history import History, HistoryCreate, HistoryUpdate
from services.auth_service import get_current_active_user
from api.v1.auth import require_permission
from db.models.user import User

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("/project/{project_id}", response_model=list[History])
def get_project_history(
    project_id: str,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
    _: User = Depends(require_permission("history:read")),
):
    return service.get_history_by_project(db, project_id)


@router.post("/", response_model=History)
def create_history(
    data: HistoryCreate,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
    _: User = Depends(require_permission("history:write")),
):
    return service.create_history(db, data)


@router.put("/{history_id}", response_model=History)
def update_history(
    history_id: str,
    data: HistoryUpdate,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
    _: User = Depends(require_permission("history:write")),
):
    updated = service.update_history(db, history_id, data)
    if not updated:
        raise HTTPException(404, "History not found")
    return updated


@router.delete("/{history_id}")
def delete_history(
    history_id: str,
    db: Session = Depends(get_db),
    service: HistoryService = Depends(get_history_service),
    _: User = Depends(require_permission("history:delete")),
):
    deleted = service.delete_history(db, history_id)
    if not deleted:
        raise HTTPException(404, "History not found")
    return {"message": "History deleted"}
