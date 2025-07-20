from sqlalchemy.orm import Session
from models.settings import SettingsCreate, SettingsUpdate
from repositories.settings_repository import SettingsRepository


class SettingsService:
    def __init__(self):
        self.db = None
        self.repo = SettingsRepository()

    def set_db(self, db: Session):
        self.db = db

    def get_all_settings(self):
        return self.repo.get_all(self.db)

    def get_setting(self, setting_key: str):
        return self.repo.get_by_key(self.db, setting_key)

    def create_or_update_setting(self, setting_data: SettingsCreate):
        return self.repo.create_or_update(self.db, setting_data)

    def delete_setting(self, setting_key: str):
        return self.repo.delete(self.db, setting_key)


settings_service = SettingsService()
