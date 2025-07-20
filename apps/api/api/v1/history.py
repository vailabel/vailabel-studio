from fastapi import APIRouter, Depends, HTTPException
from models.history import History, HistoryCreate, HistoryUpdate
from services.dependencies import get_history_service

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("/project/{project_id}", response_model=list[History])
def get_project_history(project_id: str, history_service=Depends(get_history_service)):
    return history_service.get_history_by_project(project_id)


@router.post("/", response_model=History)
def create_history(data: HistoryCreate, history_service=Depends(get_history_service)):
    return history_service.create_history(data)


@router.put("/{history_id}", response_model=History)
def update_history(
    history_id: str, data: HistoryUpdate, history_service=Depends(get_history_service)
):
    updated = history_service.update_history(history_id, data)
    if not updated:
        raise HTTPException(404, "History not found")
    return updated


@router.delete("/{history_id}")
def delete_history(history_id: str, history_service=Depends(get_history_service)):
    deleted = history_service.delete_history(history_id)
    if not deleted:
        raise HTTPException(404, "History not found")
    return {"message": "History deleted"}
