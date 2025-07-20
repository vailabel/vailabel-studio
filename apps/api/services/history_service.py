from sqlalchemy.orm import Session
from models.history import HistoryCreate, HistoryUpdate
from repositories.history_repository import HistoryRepository


class HistoryService:
    def __init__(self):
        self.repo = HistoryRepository()

    def get_history_by_project(self, db: Session, project_id: str):
        return self.repo.get_by_project(db, project_id)

    def get_history(self, db: Session, history_id: str):
        return self.repo.get(db, history_id)

    def create_history(self, db: Session, data: HistoryCreate):
        return self.repo.create(db, data)

    def update_history(self, db: Session, history_id: str, updates: HistoryUpdate):
        return self.repo.update(db, history_id, updates)

    def delete_history(self, db: Session, history_id: str):
        return self.repo.delete(db, history_id)


def get_history_service():
    return HistoryService()
