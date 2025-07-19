from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.ai_model import AIModel, AIModelCreate, AIModelUpdate
from services import ai_model_service

router = APIRouter(prefix="/api/v1/ai-models", tags=["AI Models"])

@router.get("/{model_id}", response_model=AIModel)
def get_ai_model(model_id: str, db: Session = Depends(get_db)):
    model = ai_model_service.get_ai_model(db, model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    return model

@router.get("/project/{project_id}", response_model=list[AIModel])
def get_models_by_project(project_id: str, db: Session = Depends(get_db)):
    return ai_model_service.get_ai_models_by_project(db, project_id)

@router.post("/", response_model=AIModel)
def create_model(data: AIModelCreate, db: Session = Depends(get_db)):
    return ai_model_service.create_ai_model(db, data)

@router.put("/{model_id}", response_model=AIModel)
def update_model(model_id: str, data: AIModelUpdate, db: Session = Depends(get_db)):
    updated = ai_model_service.update_ai_model(db, model_id, data)
    if not updated:
        raise HTTPException(404, "Model not found")
    return updated

@router.delete("/{model_id}")
def delete_model(model_id: str, db: Session = Depends(get_db)):
    deleted = ai_model_service.delete_ai_model(db, model_id)
    if not deleted:
        raise HTTPException(404, "Model not found")
    return {"message": "Model deleted"}
