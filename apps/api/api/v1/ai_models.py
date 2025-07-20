from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.ai_model_service import AIModelService, get_ai_model_service
from models.ai_model import AIModel, AIModelCreate, AIModelUpdate

router = APIRouter(prefix="/api/v1/ai-models", tags=["AI Models"])


@router.get("/{model_id}", response_model=AIModel)
def get_ai_model(
    model_id: str,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
):
    model = service.get_ai_model(db, model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    return model


@router.get("/project/{project_id}", response_model=list[AIModel])
def get_models_by_project(
    project_id: str,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
):
    return service.get_ai_models_by_project(db, project_id)


@router.post("/", response_model=AIModel)
def create_model(
    data: AIModelCreate,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
):
    return service.create_ai_model(db, data)


@router.put("/{model_id}", response_model=AIModel)
def update_model(
    model_id: str,
    data: AIModelUpdate,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
):
    updated = service.update_ai_model(db, model_id, data)
    if not updated:
        raise HTTPException(404, "Model not found")
    return updated


@router.delete("/{model_id}")
def delete_model(
    model_id: str,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
):
    deleted = service.delete_ai_model(db, model_id)
    if not deleted:
        raise HTTPException(404, "Model not found")
    return {"message": "Model deleted"}
