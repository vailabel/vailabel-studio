from sqlalchemy.orm import Session
from models.settings import SettingsCreate, SettingsUpdate
from repositories.settings_repository import SettingsRepository

settings_repo = SettingsRepository()


def get_all_settings(db: Session):
    return settings_repo.get_all(db)


def get_setting(db: Session, setting_key: str):
    return settings_repo.get_by_key(db, setting_key)


def create_or_update_setting(db: Session, setting_data: SettingsCreate):
    return settings_repo.create_or_update(db, setting_data)


def delete_setting(db: Session, setting_key: str):
    return settings_repo.delete(db, setting_key)
