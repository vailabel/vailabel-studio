from fastapi import APIRouter, Depends, HTTPException
from models.ai_model import AIModel, AIModelCreate, AIModelUpdate
from services.dependencies import get_ai_model_service

router = APIRouter(prefix="/api/v1/ai-models", tags=["AI Models"])


@router.get("/{model_id}", response_model=AIModel)
def get_ai_model(model_id: str, ai_model_service=Depends(get_ai_model_service)):
    model = ai_model_service.get_ai_model(model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    return model


@router.get("/project/{project_id}", response_model=list[AIModel])
def get_models_by_project(
    project_id: str, ai_model_service=Depends(get_ai_model_service)
):
    return ai_model_service.get_ai_models_by_project(project_id)


@router.post("/", response_model=AIModel)
def create_model(data: AIModelCreate, ai_model_service=Depends(get_ai_model_service)):
    return ai_model_service.create_ai_model(data)


@router.put("/{model_id}", response_model=AIModel)
def update_model(
    model_id: str, data: AIModelUpdate, ai_model_service=Depends(get_ai_model_service)
):
    updated = ai_model_service.update_ai_model(model_id, data)
    if not updated:
        raise HTTPException(404, "Model not found")
    return updated


@router.delete("/{model_id}")
def delete_model(model_id: str, ai_model_service=Depends(get_ai_model_service)):
    deleted = ai_model_service.delete_ai_model(model_id)
    if not deleted:
        raise HTTPException(404, "Model not found")
    return {"message": "Model deleted"}
