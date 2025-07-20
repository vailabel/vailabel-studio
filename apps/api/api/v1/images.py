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
    return service.get_images_by_project(db, project_id)


@router.get("/{image_id}", response_model=ImageData)
def get_image(
    image_id: str,
    db: Session = Depends(get_db),
    service: ImageDataService = Depends(get_image_data_service),
):
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
    return service.create_image(db, data)


@router.put("/{image_id}", response_model=ImageData)
def update_image(
    image_id: str,
    data: ImageDataUpdate,
    db: Session = Depends(get_db),
    service: ImageDataService = Depends(get_image_data_service),
):
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
    deleted = service.delete_image(db, image_id)
    if not deleted:
        raise HTTPException(404, "Image not found")
    return {"message": "Image deleted"}
