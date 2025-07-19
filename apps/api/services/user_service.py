from sqlalchemy.orm import Session
from models.user import UserCreate, UserUpdate
from repositories.user_repository import UserRepository

user_repo = UserRepository()


def get_users(db: Session):
    return user_repo.get_all(db)


def get_user(db: Session, user_id: str):
    return user_repo.get(db, user_id)


def create_user(db: Session, data: UserCreate):
    return user_repo.create(db, data)


def update_user(db: Session, user_id: str, updates: UserUpdate):
    return user_repo.update(db, user_id, updates)


def delete_user(db: Session, user_id: str):
    return user_repo.delete(db, user_id)
