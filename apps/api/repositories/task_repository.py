from sqlalchemy.orm import Session
from typing import List
from db.models.task import Task as TaskModel
from models.task import TaskCreate, TaskUpdate
from repositories.base_repository import BaseRepository


class TaskRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskModel)

    def get_by_project(self, db: Session, project_id: str) -> List[TaskModel]:
        return db.query(self.model).filter_by(project_id=project_id).all()
