from sqlalchemy.orm import Session
from models.image_data import ImageDataCreate, ImageDataUpdate
from repositories.image_data_repository import ImageDataRepository


class ImageDataService:
    def __init__(self):
        self.repo = ImageDataRepository()

    def get_images_by_project(self, db: Session, project_id: str):
        return self.repo.get_by_project(db, project_id)

    def get_image(self, db: Session, image_id: str):
        return self.repo.get(db, image_id)

    def create_image(self, db: Session, data: ImageDataCreate):
        return self.repo.create(db, data)

    def update_image(self, db: Session, image_id: str, updates: ImageDataUpdate):
        return self.repo.update(db, image_id, updates)

    def delete_image(self, db: Session, image_id: str):
        return self.repo.delete(db, image_id)


def get_image_data_service():
    return ImageDataService()
