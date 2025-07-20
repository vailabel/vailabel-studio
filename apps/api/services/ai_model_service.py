from sqlalchemy.orm import Session
from models.ai_model import AIModelCreate, AIModelUpdate
from repositories.ai_model_repository import AIModelRepository


class AIModelService:
    def __init__(self):
        self.repo = AIModelRepository()

    def get_ai_model(self, db: Session, model_id: str):
        return self.repo.get(db, model_id)

    def get_ai_models_by_project(self, db: Session, project_id: str):
        return self.repo.get_by_project(db, project_id)

    def create_ai_model(self, db: Session, ai_model: AIModelCreate):
        return self.repo.create(db, ai_model)

    def update_ai_model(self, db: Session, model_id: str, updates: AIModelUpdate):
        return self.repo.update(db, model_id, updates)

    def delete_ai_model(self, db: Session, model_id: str):
        return self.repo.delete(db, model_id)


def get_ai_model_service():
    return AIModelService()
