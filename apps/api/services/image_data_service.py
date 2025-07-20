from sqlalchemy.orm import Session
from models.image_data import ImageDataCreate, ImageDataUpdate
from repositories.image_data_repository import ImageDataRepository


class ImageDataService:
    def __init__(self):
        self.db = None
        self.repo = ImageDataRepository()

    def set_db(self, db: Session):
        self.db = db

    def get_images_by_project(self, project_id: str):
        return self.repo.get_by_project(self.db, project_id)

    def get_image(self, image_id: str):
        return self.repo.get(self.db, image_id)

    def create_image(self, data: ImageDataCreate):
        return self.repo.create(self.db, data)

    def update_image(self, image_id: str, updates: ImageDataUpdate):
        return self.repo.update(self.db, image_id, updates)

    def delete_image(self, image_id: str):
        return self.repo.delete(self.db, image_id)


image_data_service = ImageDataService()
