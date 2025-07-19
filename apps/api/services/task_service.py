from sqlalchemy.orm import Session
from db.models.task import Task as TaskModel
from models.task import TaskCreate, TaskUpdate

def get_tasks_by_project(db: Session, project_id: str):
    return db.query(TaskModel).filter_by(project_id=project_id).all()

def get_task(db: Session, task_id: str):
    return db.query(TaskModel).filter_by(id=task_id).first()

def create_task(db: Session, data: TaskCreate):
    task = TaskModel(**data.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def update_task(db: Session, task_id: str, updates: TaskUpdate):
    task = get_task(db, task_id)
    if not task:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task

def delete_task(db: Session, task_id: str):
    task = get_task(db, task_id)
    if task:
        db.delete(task)
        db.commit()
    return task
