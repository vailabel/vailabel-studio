from sqlalchemy.orm import Session
from models.ai_model import AIModelCreate, AIModelUpdate
from repositories.ai_model_repository import AIModelRepository


class AIModelService:
    def __init__(self):
        self.db = None
        self.repo = AIModelRepository()

    def set_db(self, db: Session):
        self.db = db

    def get_ai_model(self, model_id: str):
        return self.repo.get(self.db, model_id)

    def get_ai_models_by_project(self, project_id: str):
        return self.repo.get_by_project(self.db, project_id)

    def create_ai_model(self, ai_model: AIModelCreate):
        return self.repo.create(self.db, ai_model)

    def update_ai_model(self, model_id: str, updates: AIModelUpdate):
        return self.repo.update(self.db, model_id, updates)

    def delete_ai_model(self, model_id: str):
        return self.repo.delete(self.db, model_id)


ai_model_service = AIModelService()
