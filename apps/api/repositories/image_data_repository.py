from sqlalchemy.orm import Session
from typing import List
from db.models.image_data import ImageData as ImageDataModel
from models.image_data import ImageDataCreate, ImageDataUpdate
from repositories.base_repository import BaseRepository


class ImageDataRepository(BaseRepository):
    def __init__(self):
        super().__init__(ImageDataModel)

    def get_by_project(self, db: Session, project_id: str) -> List[ImageDataModel]:
        return db.query(self.model).filter_by(project_id=project_id).all()
