from sqlalchemy.orm import Session
from typing import List
from db.models.label import Label as LabelModel
from models.label import LabelCreate, LabelUpdate
from repositories.base_repository import BaseRepository


class LabelRepository(BaseRepository):
    def __init__(self):
        super().__init__(LabelModel)

    def get_by_project(self, db: Session, project_id: str) -> List[LabelModel]:
        return db.query(self.model).filter_by(project_id=project_id).all()
