from fastapi import APIRouter, Depends, HTTPException
from models.image_data import ImageData, ImageDataCreate, ImageDataUpdate
from services.dependencies import get_image_data_service

router = APIRouter(prefix="/api/v1/images", tags=["Images"])


@router.get("/project/{project_id}", response_model=list[ImageData])
def get_images(project_id: str, image_data_service=Depends(get_image_data_service)):
    return image_data_service.get_images_by_project(project_id)


@router.get("/{image_id}", response_model=ImageData)
def get_image(image_id: str, image_data_service=Depends(get_image_data_service)):
    image = image_data_service.get_image(image_id)
    if not image:
        raise HTTPException(404, "Image not found")
    return image


@router.post("/", response_model=ImageData)
def create_image(
    data: ImageDataCreate, image_data_service=Depends(get_image_data_service)
):
    return image_data_service.create_image(data)


@router.put("/{image_id}", response_model=ImageData)
def update_image(
    image_id: str,
    data: ImageDataUpdate,
    image_data_service=Depends(get_image_data_service),
):
    updated = image_data_service.update_image(image_id, data)
    if not updated:
        raise HTTPException(404, "Image not found")
    return updated


@router.delete("/{image_id}")
def delete_image(image_id: str, image_data_service=Depends(get_image_data_service)):
    deleted = image_data_service.delete_image(image_id)
    if not deleted:
        raise HTTPException(404, "Image not found")
    return {"message": "Image deleted"}
