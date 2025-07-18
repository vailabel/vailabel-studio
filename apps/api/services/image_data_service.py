from sqlalchemy.orm import Session
from db.models.image_data import ImageData as ImageDataModel
from models.image_data import ImageDataCreate, ImageDataUpdate

def get_images_by_project(db: Session, project_id: str):
    return db.query(ImageDataModel).filter_by(project_id=project_id).all()

def get_image(db: Session, image_id: str):
    return db.query(ImageDataModel).filter_by(id=image_id).first()

def create_image(db: Session, data: ImageDataCreate):
    image = ImageDataModel(**data.dict())
    db.add(image)
    db.commit()
    db.refresh(image)
    return image

def update_image(db: Session, image_id: str, updates: ImageDataUpdate):
    image = get_image(db, image_id)
    if not image:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(image, key, value)
    db.commit()
    db.refresh(image)
    return image

def delete_image(db: Session, image_id: str):
    image = get_image(db, image_id)
    if image:
        db.delete(image)
        db.commit()
    return image
