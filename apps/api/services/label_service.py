from sqlalchemy.orm import Session
from models.label import LabelCreate, LabelUpdate
from repositories.label_repository import LabelRepository


class LabelService:
    def __init__(self):
        self.repo = LabelRepository()

    def get_labels_by_project(self, db: Session, project_id: str):
        return self.repo.get_by_project(db, project_id)

    def get_label(self, db: Session, label_id: str):
        return self.repo.get(db, label_id)

    def create_label(self, db: Session, data: LabelCreate):
        return self.repo.create(db, data)

    def update_label(self, db: Session, label_id: str, data: LabelUpdate):
        return self.repo.update(db, label_id, data)

    def delete_label(self, db: Session, label_id: str):
        return self.repo.delete(db, label_id)


def get_label_service():
    return LabelService()
