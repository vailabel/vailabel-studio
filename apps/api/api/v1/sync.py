"""
Cloud synchronization endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from config.database import get_db
from services.cloud_sync import cloud_sync_service
from services.auth_service import get_current_user
from db.models.user import User

router = APIRouter()


@router.post("/sync/user-data")
async def sync_user_data(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Sync all user data to cloud
    """
    try:
        result = await cloud_sync_service.sync_user_data(current_user.id, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}",
        )


@router.get("/sync/status")
async def get_sync_status(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get cloud sync status
    """
    return {
        "enabled": cloud_sync_service.sync_enabled,
        "cloud_api_url": cloud_sync_service.cloud_api_url,
        "user_id": current_user.id,
    }


@router.post("/sync/project/{project_id}")
async def sync_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Sync a specific project to cloud
    """
    try:
        from db.models.project import Project

        project = (
            db.query(Project)
            .filter(Project.id == project_id, Project.user_id == current_user.id)
            .first()
        )

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )

        await cloud_sync_service._sync_project(project, db)
        return {
            "status": "success",
            "message": f"Project {project_id} synced successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Project sync failed: {str(e)}",
        )
