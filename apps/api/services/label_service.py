from sqlalchemy.orm import Session
from models.label import LabelCreate, LabelUpdate
from repositories.label_repository import LabelRepository


class LabelService:
    def __init__(self):
        self.db = None
        self.repo = LabelRepository()

    def set_db(self, db: Session):
        self.db = db

    def get_labels_by_project(self, project_id: str):
        return self.repo.get_by_project(self.db, project_id)

    def get_label(self, label_id: str):
        return self.repo.get(self.db, label_id)

    def create_label(self, data: LabelCreate):
        return self.repo.create(self.db, data)

    def update_label(self, label_id: str, data: LabelUpdate):
        return self.repo.update(self.db, label_id, data)

    def delete_label(self, label_id: str):
        return self.repo.delete(self.db, label_id)


label_service = LabelService()
