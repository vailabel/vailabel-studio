from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services import settings_service
from models.settings import Settings, SettingsCreate, SettingsUpdate

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

@router.get("/", response_model=list[Settings])
def list_settings(db: Session = Depends(get_db)):
    return settings_service.get_all_settings(db)

@router.post("/", response_model=Settings)
def create_or_update_setting(data: SettingsCreate, db: Session = Depends(get_db)):
    return settings_service.create_or_update_setting(db, data)

@router.delete("/{setting_id}")
def delete_setting(setting_id: str, db: Session = Depends(get_db)):
    deleted = settings_service.delete_setting(db, setting_id)
    if not deleted:
        raise HTTPException(404, "Setting not found")
    return {"message": "Setting deleted"}
