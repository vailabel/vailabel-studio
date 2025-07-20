from sqlalchemy.orm import Session
from models.history import HistoryCreate, HistoryUpdate
from repositories.history_repository import HistoryRepository


class HistoryService:
    def __init__(self):
        self.db = None
        self.repo = HistoryRepository()

    def set_db(self, db: Session):
        self.db = db

    def get_history_by_project(self, project_id: str):
        return self.repo.get_by_project(self.db, project_id)

    def get_history(self, history_id: str):
        return self.repo.get(self.db, history_id)

    def create_history(self, data: HistoryCreate):
        return self.repo.create(self.db, data)

    def update_history(self, history_id: str, updates: HistoryUpdate):
        return self.repo.update(self.db, history_id, updates)

    def delete_history(self, history_id: str):
        return self.repo.delete(self.db, history_id)


history_service = HistoryService()
