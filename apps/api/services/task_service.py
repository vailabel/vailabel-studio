from sqlalchemy.orm import Session
from models.task import TaskCreate, TaskUpdate
from repositories.task_repository import TaskRepository

task_repo = TaskRepository()


def get_tasks_by_project(db: Session, project_id: str):
    return task_repo.get_by_project(db, project_id)


def get_task(db: Session, task_id: str):
    return task_repo.get(db, task_id)


def create_task(db: Session, data: TaskCreate):
    return task_repo.create(db, data)


def update_task(db: Session, task_id: str, updates: TaskUpdate):
    return task_repo.update(db, task_id, updates)


def delete_task(db: Session, task_id: str):
    return task_repo.delete(db, task_id)
