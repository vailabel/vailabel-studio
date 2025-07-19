from sqlalchemy.orm import Session
from typing import List
from db.models.annotation import Annotation as AnnotationModel
from models.annotation import AnnotationCreate, AnnotationUpdate
from repositories.base_repository import BaseRepository


class AnnotationRepository(BaseRepository):
    def __init__(self):
        super().__init__(AnnotationModel)

    def get_by_project(self, db: Session, project_id: str) -> List[AnnotationModel]:
        return (
            db.query(self.model)
            .join(self.model.image)
            .filter(self.model.image.has(project_id=project_id))
            .all()
        )

    def get_by_image(self, db: Session, image_id: str) -> List[AnnotationModel]:
        return db.query(self.model).filter_by(image_id=image_id).all()
