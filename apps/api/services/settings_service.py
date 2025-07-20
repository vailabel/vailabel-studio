from sqlalchemy.orm import Session
from models.settings import SettingsCreate, SettingsUpdate
from repositories.settings_repository import SettingsRepository


class SettingsService:
    def __init__(self):
        self.repo = SettingsRepository()

    def get_all_settings(self, db: Session):
        return self.repo.get_all(db)

    def get_setting(self, db: Session, setting_key: str):
        return self.repo.get_by_key(db, setting_key)

    def create_or_update_setting(self, db: Session, setting_data: SettingsCreate):
        return self.repo.create_or_update(db, setting_data)

    def delete_setting(self, db: Session, setting_key: str):
        return self.repo.delete(db, setting_key)


def get_settings_service():
    return SettingsService()
