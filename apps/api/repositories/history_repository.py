from sqlalchemy.orm import Session
from typing import List
from db.models.history import History as HistoryModel
from models.history import HistoryCreate, HistoryUpdate
from repositories.base_repository import BaseRepository


class HistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__(HistoryModel)

    def get_by_project(self, db: Session, project_id: str) -> List[HistoryModel]:
        return db.query(self.model).filter_by(project_id=project_id).all()
