from sqlalchemy.orm import Session
from db.models.settings import Settings as SettingsModel
from models.settings import SettingsCreate, SettingsUpdate
from repositories.base_repository import BaseRepository


class SettingsRepository(BaseRepository):
    def __init__(self):
        super().__init__(SettingsModel)

    def get_by_key(self, db: Session, key: str):
        return db.query(self.model).filter_by(key=key).first()

    def create_or_update(self, db: Session, setting_data: SettingsCreate):
        setting = self.get_by_key(db, setting_data.key)
        if setting:
            setting.key = setting_data.key
            setting.value = setting_data.value
        else:
            setting = self.model(**setting_data.dict())
            db.add(setting)
        db.commit()
        db.refresh(setting)
        return setting
