from fastapi import APIRouter, Depends, HTTPException
from models.label import Label, LabelCreate, LabelUpdate
from services.dependencies import get_label_service

router = APIRouter(prefix="/api/v1/labels", tags=["Labels"])


@router.get("/project/{project_id}", response_model=list[Label])
def get_by_project(project_id: str, label_service=Depends(get_label_service)):
    return label_service.get_labels_by_project(project_id)


@router.post("/", response_model=Label)
def create(data: LabelCreate, label_service=Depends(get_label_service)):
    return label_service.create_label(data)


@router.put("/{label_id}", response_model=Label)
def update(label_id: str, data: LabelUpdate, label_service=Depends(get_label_service)):
    updated = label_service.update_label(label_id, data)
    if not updated:
        raise HTTPException(404, "Label not found")
    return updated


@router.delete("/{label_id}")
def delete(label_id: str, label_service=Depends(get_label_service)):
    deleted = label_service.delete_label(label_id)
    if not deleted:
        raise HTTPException(404, "Label not found")
    return {"message": "Label deleted"}
