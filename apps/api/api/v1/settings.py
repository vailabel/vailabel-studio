from fastapi import APIRouter, Depends, HTTPException
from models.settings import Settings, SettingsCreate, SettingsUpdate
from services.dependencies import get_settings_service

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


@router.get("/", response_model=list[Settings])
def list_settings(settings_service=Depends(get_settings_service)):
    return settings_service.get_all_settings()


@router.post("/", response_model=Settings)
def create_or_update_setting(
    data: SettingsCreate, settings_service=Depends(get_settings_service)
):
    return settings_service.create_or_update_setting(data)


@router.delete("/{setting_id}")
def delete_setting(setting_id: str, settings_service=Depends(get_settings_service)):
    deleted = settings_service.delete_setting(setting_id)
    if not deleted:
        raise HTTPException(404, "Setting not found")
    return {"message": "Setting deleted"}
