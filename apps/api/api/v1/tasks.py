from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services.task_service import get_task_service
from models.task import Task, TaskCreate, TaskUpdate
from services.auth_service import get_current_active_user
from api.v1.auth import require_permission
from db.models.user import User

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


@router.get("/", response_model=list[Task])
def get_all_tasks(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("tasks:read")),
):
    """Get all tasks across all projects"""
    return get_task_service().get_all_tasks(db)


@router.get("/{task_id}", response_model=Task)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("tasks:read")),
):
    """Get a specific task by ID"""
    task = get_task_service().get_task(db, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.get("/project/{project_id}", response_model=list[Task])
def get_project_tasks(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("tasks:read")),
):
    return get_task_service().get_tasks_by_project(db, project_id)


@router.post("/", response_model=Task)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("tasks:write")),
):
    return get_task_service().create_task(db, data)


@router.put("/{task_id}", response_model=Task)
def update_task(
    task_id: str,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("tasks:write")),
):
    updated = get_task_service().update_task(db, task_id, data)
    if not updated:
        raise HTTPException(404, "Task not found")
    return updated


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("tasks:delete")),
):
    deleted = get_task_service().delete_task(db, task_id)
    if not deleted:
        raise HTTPException(404, "Task not found")
    return {"message": "Task deleted"}