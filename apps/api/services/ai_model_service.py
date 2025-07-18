from sqlalchemy.orm import Session
from db.models.ai_model import AIModel as AIModelModel
from models.ai_model import AIModelCreate, AIModelUpdate

def get_ai_model(db: Session, model_id: str):
    return db.query(AIModelModel).filter(AIModelModel.id == model_id).first()

def get_ai_models_by_project(db: Session, project_id: str):
    return db.query(AIModelModel).filter(AIModelModel.project_id == project_id).all()

def create_ai_model(db: Session, ai_model: AIModelCreate):
    db_model = AIModelModel(**ai_model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def update_ai_model(db: Session, model_id: str, updates: AIModelUpdate):
    model = get_ai_model(db, model_id)
    if not model:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(model, key, value)
    db.commit()
    db.refresh(model)
    return model

def delete_ai_model(db: Session, model_id: str):
    model = get_ai_model(db, model_id)
    if model:
        db.delete(model)
        db.commit()
    return model
