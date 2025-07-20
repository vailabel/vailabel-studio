from fastapi import APIRouter, Depends, HTTPException
from models.annotation import Annotation, AnnotationCreate, AnnotationUpdate
from services.dependencies import get_annotation_service

router = APIRouter(prefix="/api/v1/annotations", tags=["Annotations"])


@router.get("/project/{project_id}", response_model=list[Annotation])
def get_by_project(project_id: str, annotation_service=Depends(get_annotation_service)):
    return annotation_service.get_annotations_by_project(project_id)


@router.get("/image/{image_id}", response_model=list[Annotation])
def get_by_image(image_id: str, annotation_service=Depends(get_annotation_service)):
    return annotation_service.get_annotations_by_image(image_id)


@router.post("/", response_model=Annotation)
def create(data: AnnotationCreate, annotation_service=Depends(get_annotation_service)):
    return annotation_service.create_annotation(data)


@router.put("/{annotation_id}", response_model=Annotation)
def update(
    annotation_id: str,
    data: AnnotationUpdate,
    annotation_service=Depends(get_annotation_service),
):
    updated = annotation_service.update_annotation(annotation_id, data)
    if not updated:
        raise HTTPException(404, "Annotation not found")
    return updated


@router.delete("/{annotation_id}")
def delete(annotation_id: str, annotation_service=Depends(get_annotation_service)):
    deleted = annotation_service.delete_annotation(annotation_id)
    if not deleted:
        raise HTTPException(404, "Annotation not found")
    return {"message": "Annotation deleted"}
