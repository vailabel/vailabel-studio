from sqlalchemy.orm import Session
from db.models.settings import Settings as SettingsModel
from models.settings import SettingsCreate, SettingsUpdate

def get_all_settings(db: Session):
    return db.query(SettingsModel).all()

def get_setting(db: Session, setting_key: str):
    return db.query(SettingsModel).filter_by(key=setting_key).first()

def create_or_update_setting(db: Session, setting_data: SettingsCreate):
    setting = get_setting(db, setting_data.key)
    if setting:
        # update existing
        setting.key = setting_data.key
        setting.value = setting_data.value
    else:
        # create new
        setting = SettingsModel(**setting_data.dict())
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting

def delete_setting(db: Session, setting_key: str):
    setting = get_setting(db, setting_key)
    if setting:
        db.delete(setting)
        db.commit()
    return setting
