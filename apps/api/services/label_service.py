from sqlalchemy.orm import Session
from models.label import LabelCreate, LabelUpdate
from repositories.label_repository import LabelRepository

label_repo = LabelRepository()


def get_labels_by_project(db: Session, project_id: str):
    return label_repo.get_by_project(db, project_id)


def get_label(db: Session, label_id: str):
    return label_repo.get(db, label_id)


def create_label(db: Session, data: LabelCreate):
    return label_repo.create(db, data)


def update_label(db: Session, label_id: str, data: LabelUpdate):
    return label_repo.update(db, label_id, data)


def delete_label(db: Session, label_id: str):
    return label_repo.delete(db, label_id)
