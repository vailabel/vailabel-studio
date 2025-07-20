from sqlalchemy.orm import Session
from models.user import UserCreate, UserUpdate
from repositories.user_repository import UserRepository


class UserService:
    def __init__(self):
        self.repo = UserRepository()

    def get_user_by_id(self, db: Session, user_id: str):
        return self.repo.get(db, user_id)

    def create_user(self, db: Session, data: UserCreate):
        return self.repo.create(db, data)

    def update_user(self, db: Session, user_id: str, updates: UserUpdate):
        return self.repo.update(db, user_id, updates)

    def delete_user(self, db: Session, user_id: str):
        return self.repo.delete(db, user_id)


def get_user_service():
    return UserService()
