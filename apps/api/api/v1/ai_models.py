from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.ai_model_service import AIModelService, get_ai_model_service
from models.ai_model import AIModel, AIModelCreate, AIModelUpdate
from services.auth_service import get_current_active_user
from api.v1.auth import require_permission
from db.models.user import User

router = APIRouter(prefix="/api/v1/ai-models", tags=["AI Models"])


@router.get("/{model_id}", response_model=AIModel)
def get_ai_model(
    model_id: str,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
    _: User = Depends(require_permission("ai_models:read")),
):
    """
    Retrieve a specific AI model by its ID.
    
    Args:
        model_id: The unique identifier of the AI model
        db: Database session dependency
        service: AI model service dependency
    
    Returns:
        The requested AI model object
    
    Raises:
        HTTPException: 404 error if the model is not found
    """
    model = service.get_ai_model(db, model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    return model


@router.get("/project/{project_id}", response_model=list[AIModel])
def get_models_by_project(
    project_id: str,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
    _: User = Depends(require_permission("ai_models:read")),
):
    """
    Retrieve all AI models associated with a specific project.
    
    Args:
        project_id: The unique identifier of the project
        db: Database session dependency
        service: AI model service dependency
    
    Returns:
        List of AI models belonging to the project
    """
    return service.get_ai_models_by_project(db, project_id)


@router.post("/", response_model=AIModel)
def create_model(
    data: AIModelCreate,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
    _: User = Depends(require_permission("ai_models:write")),
):
    """
    Create a new AI model.
    
    Args:
        data: The data for creating a new AI model
        db: Database session dependency
        service: AI model service dependency
    
    Returns:
        The newly created AI model object
    """
    return service.create_ai_model(db, data)


@router.put("/{model_id}", response_model=AIModel)
def update_model(
    model_id: str,
    data: AIModelUpdate,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
    _: User = Depends(require_permission("ai_models:write")),
):
    """
    Update an existing AI model.
    
    Args:
        model_id: The unique identifier of the AI model to update
        data: The data for updating the AI model
        db: Database session dependency
        service: AI model service dependency
    
    Returns:
        The updated AI model object
    
    Raises:
        HTTPException: 404 error if the model is not found
    """
    updated = service.update_ai_model(db, model_id, data)
    if not updated:
        raise HTTPException(404, "Model not found")
    return updated


@router.delete("/{model_id}")
def delete_model(
    model_id: str,
    db: Session = Depends(get_db),
    service: AIModelService = Depends(get_ai_model_service),
    _: User = Depends(require_permission("ai_models:delete")),
):
    """
    Delete an AI model by its ID.
    
    Args:
        model_id: The unique identifier of the AI model to delete
        db: Database session dependency
        service: AI model service dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the model is not found
    """
    deleted = service.delete_ai_model(db, model_id)
    if not deleted:
        raise HTTPException(404, "Model not found")
    return {"message": "Model deleted"}