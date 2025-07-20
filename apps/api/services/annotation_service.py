from sqlalchemy.orm import Session
from models.annotation import AnnotationCreate, AnnotationUpdate
from repositories.annotation_repository import AnnotationRepository


class AnnotationService:
    def __init__(self):
        self.repo = AnnotationRepository()

    def get_annotations_by_project(self, db: Session, project_id: str):
        return self.repo.get_by_project(db, project_id)

    def get_annotations_by_image(self, db: Session, image_id: str):
        return self.repo.get_by_image(db, image_id)

    def create_annotation(self, db: Session, data: AnnotationCreate):
        return self.repo.create(db, data)

    def update_annotation(
        self, db: Session, annotation_id: str, updates: AnnotationUpdate
    ):
        return self.repo.update(db, annotation_id, updates)

    def delete_annotation(self, db: Session, annotation_id: str):
        return self.repo.delete(db, annotation_id)


def get_annotation_service():
    return AnnotationService()
