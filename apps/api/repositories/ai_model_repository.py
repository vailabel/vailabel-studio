from sqlalchemy.orm import Session
from typing import List
from db.models.ai_model import AIModel as AIModelModel
from models.ai_model import AIModelCreate, AIModelUpdate
from repositories.base_repository import BaseRepository


class AIModelRepository(BaseRepository):
    def __init__(self):
        super().__init__(AIModelModel)

    def get_by_project(self, db: Session, project_id: str) -> List[AIModelModel]:
        return db.query(self.model).filter(self.model.project_id == project_id).all()
