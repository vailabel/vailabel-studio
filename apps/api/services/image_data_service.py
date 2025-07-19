from sqlalchemy.orm import Session
from models.image_data import ImageDataCreate, ImageDataUpdate
from repositories.image_data_repository import ImageDataRepository

image_data_repo = ImageDataRepository()


def get_images_by_project(db: Session, project_id: str):
    return image_data_repo.get_by_project(db, project_id)


def get_image(db: Session, image_id: str):
    return image_data_repo.get(db, image_id)


def create_image(db: Session, data: ImageDataCreate):
    return image_data_repo.create(db, data)


def update_image(db: Session, image_id: str, updates: ImageDataUpdate):
    return image_data_repo.update(db, image_id, updates)


def delete_image(db: Session, image_id: str):
    return image_data_repo.delete(db, image_id)
