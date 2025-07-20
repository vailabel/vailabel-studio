from fastapi import Depends
from db.session import get_db
from sqlalchemy.orm import Session


def get_annotation_service(db: Session = Depends(get_db)):
    from services.annotation_service import annotation_service

    annotation_service.set_db(db)
    return annotation_service


def get_ai_model_service(db: Session = Depends(get_db)):
    from services.ai_model_service import ai_model_service

    ai_model_service.set_db(db)
    return ai_model_service


def get_history_service(db: Session = Depends(get_db)):
    from services.history_service import history_service

    history_service.set_db(db)
    return history_service


def get_project_service(db: Session = Depends(get_db)):
    from services.project_service import project_service

    project_service.set_db(db)
    return project_service


def get_settings_service(db: Session = Depends(get_db)):
    from services.settings_service import settings_service

    settings_service.set_db(db)
    return settings_service


def get_image_data_service(db: Session = Depends(get_db)):
    from services.image_data_service import image_data_service

    image_data_service.set_db(db)
    return image_data_service


def get_label_service(db: Session = Depends(get_db)):
    from services.label_service import label_service

    label_service.set_db(db)
    return label_service
