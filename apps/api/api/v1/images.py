from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.image_data_service import ImageDataService, get_image_data_service
from models.image_data import ImageData, ImageDataCreate, ImageDataUpdate

router = APIRouter(prefix="/api/v1/images", tags=["Images"])


@router.get("/project/{project_id}", response_model=list[ImageData])
def get_images(
    project_id: str,
    db: Session = Depends(get_db),
    service: ImageDataService = Depends(get_image_data_service),
):
    """
    Retrieve all images associated with a specific project.
    
    Args:
        project_id: The unique identifier of the project
        db: Database session dependency
        service: Image data service dependency
    
    Returns:
        List of images belonging to the project
    """
    return service.get_images_by_project(db, project_id)


@router.get("/{image_id}", response_model=ImageData)
def get_image(
    image_id: str,
    db: Session = Depends(get_db),
    service: ImageDataService = Depends(get_image_data_service),
):
    """
    Retrieve a specific image by its ID.
    
    Args:
        image_id: The unique identifier of the image
        db: Database session dependency
        service: Image data service dependency
    
    Returns:
        The requested image object
    
    Raises:
        HTTPException: 404 error if the image is not found
    """
    image = service.get_image(db, image_id)
    if not image:
        raise HTTPException(404, "Image not found")
    return image


@router.post("/", response_model=ImageData)
def create_image(
    data: ImageDataCreate,
    db: Session = Depends(get_db),
    service: ImageDataService = Depends(get_image_data_service),
):
    """
    Create a new image record.
    
    Args:
        data: The data for creating a new image
        db: Database session dependency
        service: Image data service dependency
    
    Returns:
        The newly created image object
    """
    return service.create_image(db, data)


@router.put("/{image_id}", response_model=ImageData)
def update_image(
    image_id: str,
    data: ImageDataUpdate,
    db: Session = Depends(get_db),
    service: ImageDataService = Depends(get_image_data_service),
):
    """
    Update an existing image record.
    
    Args:
        image_id: The unique identifier of the image to update
        data: The data for updating the image
        db: Database session dependency
        service: Image data service dependency
    
    Returns:
        The updated image object
    
    Raises:
        HTTPException: 404 error if the image is not found
    """
    updated = service.update_image(db, image_id, data)
    if not updated:
        raise HTTPException(404, "Image not found")
    return updated


@router.delete("/{image_id}")
def delete_image(
    image_id: str,
    db: Session = Depends(get_db),
    service: ImageDataService = Depends(get_image_data_service),
):
    """
    Delete an image by its ID.
    
    Args:
        image_id: The unique identifier of the image to delete
        db: Database session dependency
        service: Image data service dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the image is not found
    """
    deleted = service.delete_image(db, image_id)
    if not deleted:
        raise HTTPException(404, "Image not found")
    return {"message": "Image deleted"}