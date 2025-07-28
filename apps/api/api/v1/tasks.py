from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services import task_service
from models.task import Task, TaskCreate, TaskUpdate

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


@router.get("/", response_model=list[Task])
def get_all_tasks(db: Session = Depends(get_db)):
    """Get all tasks across all projects"""
    return task_service.get_all_tasks(db)


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: str, db: Session = Depends(get_db)):
    """Get a specific task by ID"""
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.get("/project/{project_id}", response_model=list[Task])
def get_project_tasks(project_id: str, db: Session = Depends(get_db)):
    return task_service.get_tasks_by_project(db, project_id)


@router.post("/", response_model=Task)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    return task_service.create_task(db, data)


@router.put("/{task_id}", response_model=Task)
def update_task(task_id: str, data: TaskUpdate, db: Session = Depends(get_db)):
    updated = task_service.update_task(db, task_id, data)
    if not updated:
        raise HTTPException(404, "Task not found")
    return updated


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    deleted = task_service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(404, "Task not found")
    return {"message": "Task deleted"}
