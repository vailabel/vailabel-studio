from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services import history_service
from models.history import History, HistoryCreate, HistoryUpdate

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("/project/{project_id}", response_model=list[History])
def get_project_history(project_id: str, db: Session = Depends(get_db)):
    return history_service.get_history_by_project(db, project_id)


@router.post("/", response_model=History)
def create_history(data: HistoryCreate, db: Session = Depends(get_db)):
    return history_service.create_history(db, data)


@router.put("/{history_id}", response_model=History)
def update_history(history_id: str, data: HistoryUpdate, db: Session = Depends(get_db)):
    updated = history_service.update_history(db, history_id, data)
    if not updated:
        raise HTTPException(404, "History not found")
    return updated


@router.delete("/{history_id}")
def delete_history(history_id: str, db: Session = Depends(get_db)):
    deleted = history_service.delete_history(db, history_id)
    if not deleted:
        raise HTTPException(404, "History not found")
    return {"message": "History deleted"}
