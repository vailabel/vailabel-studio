from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.annotation_service import AnnotationService, get_annotation_service
from models.annotation import Annotation, AnnotationCreate, AnnotationUpdate
from services.auth_service import get_current_active_user
from api.v1.auth import require_permission
from db.models.user import User

router = APIRouter(prefix="/api/v1/annotations", tags=["Annotations"])


@router.get("/project/{project_id}", response_model=list[Annotation])
def get_by_project(
    project_id: str,
    db: Session = Depends(get_db),
    service: AnnotationService = Depends(get_annotation_service),
    _: User = Depends(require_permission("annotations:read")),
):
    """
    Retrieve all annotations associated with a specific project.
    
    Args:
        project_id: The unique identifier of the project
        db: Database session dependency
        service: Annotation service dependency
    
    Returns:
        List of annotations belonging to the project
    """
    return service.get_annotations_by_project(db, project_id)


@router.get("/image/{image_id}", response_model=list[Annotation])
def get_by_image(
    image_id: str,
    db: Session = Depends(get_db),
    service: AnnotationService = Depends(get_annotation_service),
    _: User = Depends(require_permission("annotations:read")),
):
    """
    Retrieve all annotations associated with a specific image.
    
    Args:
        image_id: The unique identifier of the image
        db: Database session dependency
        service: Annotation service dependency
    
    Returns:
        List of annotations belonging to the image
    """
    return service.get_annotations_by_image(db, image_id)


@router.post("/", response_model=Annotation)
def create(
    data: AnnotationCreate,
    db: Session = Depends(get_db),
    service: AnnotationService = Depends(get_annotation_service),
    _: User = Depends(require_permission("annotations:write")),
):
    """
    Create a new annotation.
    
    Args:
        data: The data for creating a new annotation
        db: Database session dependency
        service: Annotation service dependency
    
    Returns:
        The newly created annotation object
    """
    return service.create_annotation(db, data)


@router.put("/{annotation_id}", response_model=Annotation)
def update(
    annotation_id: str,
    data: AnnotationUpdate,
    db: Session = Depends(get_db),
    service: AnnotationService = Depends(get_annotation_service),
    _: User = Depends(require_permission("annotations:write")),
):
    """
    Update an existing annotation.
    
    Args:
        annotation_id: The unique identifier of the annotation to update
        data: The data for updating the annotation
        db: Database session dependency
        service: Annotation service dependency
    
    Returns:
        The updated annotation object
    
    Raises:
        HTTPException: 404 error if the annotation is not found
    """
    updated = service.update_annotation(db, annotation_id, data)
    if not updated:
        raise HTTPException(404, "Annotation not found")
    return updated


@router.delete("/{annotation_id}")
def delete(
    annotation_id: str,
    db: Session = Depends(get_db),
    service: AnnotationService = Depends(get_annotation_service),
    _: User = Depends(require_permission("annotations:delete")),
):
    """
    Delete an annotation by its ID.
    
    Args:
        annotation_id: The unique identifier of the annotation to delete
        db: Database session dependency
        service: Annotation service dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the annotation is not found
    """
    deleted = service.delete_annotation(db, annotation_id)
    if not deleted:
        raise HTTPException(404, "Annotation not found")
    return {"message": "Annotation deleted"}