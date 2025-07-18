from sqlalchemy.orm import Session
from db.models.annotation import Annotation as AnnotationModel
from models.annotation import AnnotationCreate, AnnotationUpdate

def get_annotations_by_project(db: Session, project_id: str):
    return db.query(AnnotationModel).join(AnnotationModel.image).filter(
        AnnotationModel.image.has(project_id=project_id)
    ).all()

def get_annotations_by_image(db: Session, image_id: str):
    return db.query(AnnotationModel).filter_by(image_id=image_id).all()

def create_annotation(db: Session, data: AnnotationCreate):
    ann = AnnotationModel(**data.dict())
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann

def update_annotation(db: Session, annotation_id: str, updates: AnnotationUpdate):
    ann = db.query(AnnotationModel).filter_by(id=annotation_id).first()
    if not ann:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(ann, key, value)
    db.commit()
    db.refresh(ann)
    return ann

def delete_annotation(db: Session, annotation_id: str):
    ann = db.query(AnnotationModel).filter_by(id=annotation_id).first()
    if ann:
        db.delete(ann)
        db.commit()
    return ann
