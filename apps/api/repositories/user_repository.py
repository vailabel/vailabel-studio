from sqlalchemy.orm import Session
from db.models.user import User as UserModel
from models.user import UserCreate, UserUpdate
from repositories.base_repository import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__(UserModel)

    def get_all(self, db: Session):
        return db.query(self.model).all()
