from sqlalchemy.orm import Session
from models.annotation import AnnotationCreate, AnnotationUpdate
from repositories.annotation_repository import AnnotationRepository

annotation_repo = AnnotationRepository()


def get_annotations_by_project(db: Session, project_id: str):
    return annotation_repo.get_by_project(db, project_id)


def get_annotations_by_image(db: Session, image_id: str):
    return annotation_repo.get_by_image(db, image_id)


def create_annotation(db: Session, data: AnnotationCreate):
    return annotation_repo.create(db, data)


def update_annotation(db: Session, annotation_id: str, updates: AnnotationUpdate):
    return annotation_repo.update(db, annotation_id, updates)


def delete_annotation(db: Session, annotation_id: str):
    return annotation_repo.delete(db, annotation_id)
