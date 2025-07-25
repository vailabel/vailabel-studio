from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.label_service import LabelService, get_label_service
from models.label import Label, LabelCreate, LabelUpdate

router = APIRouter(prefix="/api/v1/labels", tags=["Labels"])


@router.get("/project/{project_id}", response_model=list[Label])
def get_by_project(
    project_id: str,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
):
    return service.get_labels_by_project(db, project_id)


@router.post("/", response_model=Label)
def create(
    data: LabelCreate,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
):
    return service.create_label(db, data)


@router.put("/{label_id}", response_model=Label)
def update(
    label_id: str,
    data: LabelUpdate,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
):
    updated = service.update_label(db, label_id, data)
    if not updated:
        raise HTTPException(404, "Label not found")
    return updated


@router.delete("/{label_id}")
def delete(
    label_id: str,
    db: Session = Depends(get_db),
    service: LabelService = Depends(get_label_service),
):
    deleted = service.delete_label(db, label_id)
    if not deleted:
        raise HTTPException(404, "Label not found")
    return {"message": "Label deleted"}
