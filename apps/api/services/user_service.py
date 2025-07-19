from sqlalchemy.orm import Session
from db.models.user import User as UserModel
from models.user import UserCreate, UserUpdate

def get_users(db: Session):
    return db.query(UserModel).all()

def get_user(db: Session, user_id: str):
    return db.query(UserModel).filter_by(id=user_id).first()

def create_user(db: Session, data: UserCreate):
    user = UserModel(**data.dict())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user_id: str, updates: UserUpdate):
    user = get_user(db, user_id)
    if not user:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: str):
    user = get_user(db, user_id)
    if user:
        db.delete(user)
        db.commit()
    return user
