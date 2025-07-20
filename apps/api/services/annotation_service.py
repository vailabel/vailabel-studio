from sqlalchemy.orm import Session
from models.annotation import AnnotationCreate, AnnotationUpdate
from repositories.annotation_repository import AnnotationRepository


class AnnotationService:
    def __init__(self):
        self.db = None
        self.repo = AnnotationRepository()

    def set_db(self, db: Session):
        self.db = db

    def get_annotations_by_project(self, project_id: str):
        return self.repo.get_by_project(self.db, project_id)

    def get_annotations_by_image(self, image_id: str):
        return self.repo.get_by_image(self.db, image_id)

    def create_annotation(self, data: AnnotationCreate):
        return self.repo.create(self.db, data)

    def update_annotation(self, annotation_id: str, updates: AnnotationUpdate):
        return self.repo.update(self.db, annotation_id, updates)

    def delete_annotation(self, annotation_id: str):
        return self.repo.delete(self.db, annotation_id)


annotation_service = AnnotationService()
