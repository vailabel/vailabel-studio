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
    """
    Retrieve all settings.
    
    Args:
        db: Database session dependency
        service: Settings service dependency
    
    Returns:
        List of all settings
    """
    return service.get_all_settings(db)


@router.post("/", response_model=Settings)
def create_or_update_setting(
    data: SettingsCreate,
    db: Session = Depends(get_db),
    service: SettingsService = Depends(get_settings_service),
    _: User = Depends(require_permission("settings:write")),
):
    """
    Create a new setting or update an existing one.
    
    Args:
        data: The data for creating or updating a setting
        db: Database session dependency
        service: Settings service dependency
    
    Returns:
        The created or updated setting object
    """
    return service.create_or_update_setting(db, data)


@router.delete("/{setting_id}")
def delete_setting(
    setting_id: str,
    db: Session = Depends(get_db),
    service: SettingsService = Depends(get_settings_service),
    _: User = Depends(require_permission("settings:delete")),
):
    """
    Delete a setting by its ID.
    
    Args:
        setting_id: The unique identifier of the setting to delete
        db: Database session dependency
        service: Settings service dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the setting is not found
    """
    deleted = service.delete_setting(db, setting_id)
    if not deleted:
        raise HTTPException(404, "Setting not found")
    return {"message": "Setting deleted"}