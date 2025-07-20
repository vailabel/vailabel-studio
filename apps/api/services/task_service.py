from sqlalchemy.orm import Session
from models.task import TaskCreate, TaskUpdate
from repositories.task_repository import TaskRepository


class TaskService:
    def __init__(self):
        self.repo = TaskRepository()

    def get_tasks_by_project(self, db: Session, project_id: str):
        return self.repo.get_by_project(db, project_id)

    def get_task(self, db: Session, task_id: str):
        return self.repo.get(db, task_id)

    def create_task(self, db: Session, data: TaskCreate):
        return self.repo.create(db, data)

    def update_task(self, db: Session, task_id: str, data: TaskUpdate):
        return self.repo.update(db, task_id, data)

    def delete_task(self, db: Session, task_id: str):
        return self.repo.delete(db, task_id)


def get_task_service():
    return TaskService()
