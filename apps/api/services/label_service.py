from sqlalchemy.orm import Session
from db.models.label import Label as LabelModel
from models.label import LabelCreate, LabelUpdate

def get_labels_by_project(db: Session, project_id: str):
    return db.query(LabelModel).filter_by(project_id=project_id).all()

def get_label(db: Session, label_id: str):
    return db.query(LabelModel).filter_by(id=label_id).first()

def create_label(db: Session, data: LabelCreate):
    label = LabelModel(**data.dict())
    db.add(label)
    db.commit()
    db.refresh(label)
    return label

def update_label(db: Session, label_id: str, data: LabelUpdate):
    label = get_label(db, label_id)
    if not label:
        return None
    for key, value in data.dict(exclude_unset=True).items():
        setattr(label, key, value)
    db.commit()
    db.refresh(label)
    return label

def delete_label(db: Session, label_id: str):
    label = get_label(db, label_id)
    if label:
        db.delete(label)
        db.commit()
    return label
