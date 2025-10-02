from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services import task_service
from models.task import Task, TaskCreate, TaskUpdate

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


@router.get("/", response_model=list[Task])
def get_all_tasks(db: Session = Depends(get_db)):
    """
    Get all tasks across all projects.
    
    Args:
        db: Database session dependency
    
    Returns:
        List of all tasks
    """
    return task_service.get_all_tasks(db)


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: str, db: Session = Depends(get_db)):
    """
    Get a specific task by ID.
    
    Args:
        task_id: The unique identifier of the task
        db: Database session dependency
    
    Returns:
        The requested task object
    
    Raises:
        HTTPException: 404 error if the task is not found
    """
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.get("/project/{project_id}", response_model=list[Task])
def get_project_tasks(project_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all tasks associated with a specific project.
    
    Args:
        project_id: The unique identifier of the project
        db: Database session dependency
    
    Returns:
        List of tasks belonging to the project
    """
    return task_service.get_tasks_by_project(db, project_id)


@router.post("/", response_model=Task)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    """
    Create a new task.
    
    Args:
        data: The data for creating a new task
        db: Database session dependency
    
    Returns:
        The newly created task object
    """
    return task_service.create_task(db, data)


@router.put("/{task_id}", response_model=Task)
def update_task(task_id: str, data: TaskUpdate, db: Session = Depends(get_db)):
    """
    Update an existing task.
    
    Args:
        task_id: The unique identifier of the task to update
        data: The data for updating the task
        db: Database session dependency
    
    Returns:
        The updated task object
    
    Raises:
        HTTPException: 404 error if the task is not found
    """
    updated = task_service.update_task(db, task_id, data)
    if not updated:
        raise HTTPException(404, "Task not found")
    return updated


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    """
    Delete a task by its ID.
    
    Args:
        task_id: The unique identifier of the task to delete
        db: Database session dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the task is not found
    """
    deleted = task_service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(404, "Task not found")
    return {"message": "Task deleted"}