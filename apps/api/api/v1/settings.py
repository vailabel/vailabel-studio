from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.settings_service import SettingsService, get_settings_service
from models.settings import Settings, SettingsCreate, SettingsUpdate
from services.auth_service import get_current_active_user
from api.v1.auth import require_permission
from db.models.user import User

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


@router.get("/", response_model=list[Settings])
def list_settings(
    db: Session = Depends(get_db),
    service: SettingsService = Depends(get_settings_service),
    _: User = Depends(require_permission("settings:read")),
):
    return service.get_all_settings(db)


@router.post("/", response_model=Settings)
def create_or_update_setting(
    data: SettingsCreate,
    db: Session = Depends(get_db),
    service: SettingsService = Depends(get_settings_service),
    _: User = Depends(require_permission("settings:write")),
):
    return service.create_or_update_setting(db, data)


@router.delete("/{setting_id}")
def delete_setting(
    setting_id: str,
    db: Session = Depends(get_db),
    service: SettingsService = Depends(get_settings_service),
    _: User = Depends(require_permission("settings:delete")),
):
    deleted = service.delete_setting(db, setting_id)
    if not deleted:
        raise HTTPException(404, "Setting not found")
    return {"message": "Setting deleted"}
