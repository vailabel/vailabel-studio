from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services import annotation_service
from models.annotation import Annotation, AnnotationCreate, AnnotationUpdate

router = APIRouter(prefix="/annotations", tags=["Annotations"])

@router.get("/project/{project_id}", response_model=list[Annotation])
def get_by_project(project_id: str, db: Session = Depends(get_db)):
    return annotation_service.get_annotations_by_project(db, project_id)

@router.get("/image/{image_id}", response_model=list[Annotation])
def get_by_image(image_id: str, db: Session = Depends(get_db)):
    return annotation_service.get_annotations_by_image(db, image_id)

@router.post("/", response_model=Annotation)
def create(data: AnnotationCreate, db: Session = Depends(get_db)):
    return annotation_service.create_annotation(db, data)

@router.put("/{annotation_id}", response_model=Annotation)
def update(annotation_id: str, data: AnnotationUpdate, db: Session = Depends(get_db)):
    updated = annotation_service.update_annotation(db, annotation_id, data)
    if not updated:
        raise HTTPException(404, "Annotation not found")
    return updated

@router.delete("/{annotation_id}")
def delete(annotation_id: str, db: Session = Depends(get_db)):
    deleted = annotation_service.delete_annotation(db, annotation_id)
    if not deleted:
        raise HTTPException(404, "Annotation not found")
    return {"message": "Annotation deleted"}
