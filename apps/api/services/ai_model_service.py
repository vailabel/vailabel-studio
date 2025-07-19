from sqlalchemy.orm import Session
from models.ai_model import AIModelCreate, AIModelUpdate
from repositories.ai_model_repository import AIModelRepository


ai_model_repo = AIModelRepository()


def get_ai_model(db: Session, model_id: str):
    return ai_model_repo.get(db, model_id)


def get_ai_models_by_project(db: Session, project_id: str):
    return ai_model_repo.get_by_project(db, project_id)


def create_ai_model(db: Session, ai_model: AIModelCreate):
    return ai_model_repo.create(db, ai_model)


def update_ai_model(db: Session, model_id: str, updates: AIModelUpdate):
    return ai_model_repo.update(db, model_id, updates)


def delete_ai_model(db: Session, model_id: str):
    return ai_model_repo.delete(db, model_id)
