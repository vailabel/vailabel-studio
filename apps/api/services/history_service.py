from sqlalchemy.orm import Session
from models.history import HistoryCreate, HistoryUpdate
from repositories.history_repository import HistoryRepository

history_repo = HistoryRepository()


def get_history_by_project(db: Session, project_id: str):
    return history_repo.get_by_project(db, project_id)


def get_history(db: Session, history_id: str):
    return history_repo.get(db, history_id)


def create_history(db: Session, data: HistoryCreate):
    return history_repo.create(db, data)


def update_history(db: Session, history_id: str, updates: HistoryUpdate):
    return history_repo.update(db, history_id, updates)


def delete_history(db: Session, history_id: str):
    return history_repo.delete(db, history_id)
