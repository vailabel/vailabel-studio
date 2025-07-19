from sqlalchemy.orm import Session
from db.models.history import History as HistoryModel
from models.history import HistoryCreate, HistoryUpdate

def get_history_by_project(db: Session, project_id: str):
    return db.query(HistoryModel).filter_by(project_id=project_id).all()

def get_history(db: Session, history_id: str):
    return db.query(HistoryModel).filter_by(id=history_id).first()

def create_history(db: Session, data: HistoryCreate):
    history = HistoryModel(**data.dict())
    db.add(history)
    db.commit()
    db.refresh(history)
    return history

def update_history(db: Session, history_id: str, updates: HistoryUpdate):
    history = get_history(db, history_id)
    if not history:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(history, key, value)
    db.commit()
    db.refresh(history)
    return history

def delete_history(db: Session, history_id: str):
    history = get_history(db, history_id)
    if history:
        db.delete(history)
        db.commit()
    return history
