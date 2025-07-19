from sqlalchemy.orm import Session
from typing import Generic, TypeVar, Type, Optional, List

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T]):
        self.model = model

    def get(self, db: Session, obj_id: str) -> Optional[T]:
        return db.query(self.model).filter(self.model.id == obj_id).first()

    def get_all(self, db: Session) -> List[T]:
        return db.query(self.model).all()

    def create(self, db: Session, obj_in) -> T:
        db_obj = self.model(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, obj_id: str, updates) -> Optional[T]:
        obj = self.get(db, obj_id)
        if not obj:
            return None
        for key, value in updates.dict(exclude_unset=True).items():
            setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, obj_id: str) -> Optional[T]:
        obj = self.get(db, obj_id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj
