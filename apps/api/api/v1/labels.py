from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services import label_service
from models.label import Label, LabelCreate, LabelUpdate

router = APIRouter(prefix="/labels", tags=["Labels"])

@router.get("/project/{project_id}", response_model=list[Label])
def get_by_project(project_id: str, db: Session = Depends(get_db)):
    return label_service.get_labels_by_project(db, project_id)

@router.post("/", response_model=Label)
def create(data: LabelCreate, db: Session = Depends(get_db)):
    return label_service.create_label(db, data)

@router.put("/{label_id}", response_model=Label)
def update(label_id: str, data: LabelUpdate, db: Session = Depends(get_db)):
    updated = label_service.update_label(db, label_id, data)
    if not updated:
        raise HTTPException(404, "Label not found")
    return updated

@router.delete("/{label_id}")
def delete(label_id: str, db: Session = Depends(get_db)):
    deleted = label_service.delete_label(db, label_id)
    if not deleted:
        raise HTTPException(404, "Label not found")
    return {"message": "Label deleted"}
