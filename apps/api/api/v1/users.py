from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from services import user_service
from models.user import User, UserCreate, UserUpdate

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/", response_model=list[User])
def list_users(db: Session = Depends(get_db)):
    """
    Retrieve all users.
    
    Args:
        db: Database session dependency
    
    Returns:
        List of all users
    """
    return user_service.get_users(db)


@router.post("/", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.
    
    Args:
        user: The data for creating a new user
        db: Database session dependency
    
    Returns:
        The newly created user object
    """
    return user_service.create_user(db, user)


@router.put("/{user_id}", response_model=User)
def update_user(user_id: str, user: UserUpdate, db: Session = Depends(get_db)):
    """
    Update an existing user.
    
    Args:
        user_id: The unique identifier of the user to update
        user: The data for updating the user
        db: Database session dependency
    
    Returns:
        The updated user object
    
    Raises:
        HTTPException: 404 error if the user is not found
    """
    updated = user_service.update_user(db, user_id, user)
    if not updated:
        raise HTTPException(404, detail="User not found")
    return updated


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    """
    Delete a user by its ID.
    
    Args:
        user_id: The unique identifier of the user to delete
        db: Database session dependency
    
    Returns:
        Success message confirming deletion
    
    Raises:
        HTTPException: 404 error if the user is not found
    """
    deleted = user_service.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(404, detail="User not found")
    return {"message": "User deleted"}