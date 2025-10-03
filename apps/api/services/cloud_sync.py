"""
Cloud synchronization service for local and cloud data
"""

import asyncio
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from config.settings import settings
from db.models.user import User
from db.models.project import Project
from db.models.annotation import Annotation
from db.models.image_data import ImageData
from db.models.label import Label
from db.models.task import Task
from db.models.history import History
from db.models.ai_model import AIModel
from db.models.settings import Settings as AppSettings
import logging

logger = logging.getLogger(__name__)


class CloudSyncService:
    def __init__(self):
        self.cloud_api_url = settings.CLOUD_API_URL
        self.sync_enabled = settings.CLOUD_SYNC_ENABLED
        self.client = httpx.AsyncClient(timeout=30.0)

    async def sync_user_data(self, user_id: str, db: Session) -> Dict[str, Any]:
        """Sync all user data to cloud"""
        if not self.sync_enabled:
            return {"status": "disabled", "message": "Cloud sync is disabled"}

        try:
            # Get user data
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"status": "error", "message": "User not found"}

            # Sync projects
            projects = db.query(Project).filter(Project.user_id == user_id).all()
            for project in projects:
                await self._sync_project(project, db)

            # Sync AI models
            ai_models = db.query(AIModel).filter(AIModel.user_id == user_id).all()
            for model in ai_models:
                await self._sync_ai_model(model, db)

            # Sync settings
            user_settings = (
                db.query(AppSettings).filter(AppSettings.user_id == user_id).all()
            )
            for setting in user_settings:
                await self._sync_settings(setting, db)

            return {
                "status": "success",
                "message": f"Synced {len(projects)} projects, {len(ai_models)} AI models, {len(user_settings)} settings",
            }

        except Exception as e:
            logger.error(f"Cloud sync failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    async def _sync_project(self, project: Project, db: Session):
        """Sync a single project to cloud"""
        try:
            # Prepare project data
            project_data = {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "user_id": project.user_id,
                "created_at": (
                    project.created_at.isoformat() if project.created_at else None
                ),
                "updated_at": (
                    project.updated_at.isoformat() if project.updated_at else None
                ),
            }

            # Send to cloud API
            response = await self.client.post(
                f"{self.cloud_api_url}/api/v1/projects/sync",
                json=project_data,
                headers={"Authorization": f"Bearer {self._get_auth_token()}"},
            )

            if response.status_code == 200:
                logger.info(f"Project {project.id} synced successfully")

                # Sync project-related data
                await self._sync_project_annotations(project.id, db)
                await self._sync_project_images(project.id, db)
                await self._sync_project_labels(project.id, db)
                await self._sync_project_tasks(project.id, db)
            else:
                logger.error(f"Failed to sync project {project.id}: {response.text}")

        except Exception as e:
            logger.error(f"Error syncing project {project.id}: {str(e)}")

    async def _sync_project_annotations(self, project_id: str, db: Session):
        """Sync project annotations"""
        annotations = (
            db.query(Annotation)
            .join(ImageData)
            .filter(ImageData.project_id == project_id)
            .all()
        )

        for annotation in annotations:
            try:
                annotation_data = {
                    "id": annotation.id,
                    "image_id": annotation.image_id,
                    "label_id": annotation.label_id,
                    "coordinates": annotation.coordinates,
                    "created_at": (
                        annotation.created_at.isoformat()
                        if annotation.created_at
                        else None
                    ),
                    "updated_at": (
                        annotation.updated_at.isoformat()
                        if annotation.updated_at
                        else None
                    ),
                }

                response = await self.client.post(
                    f"{self.cloud_api_url}/api/v1/annotations/sync",
                    json=annotation_data,
                    headers={"Authorization": f"Bearer {self._get_auth_token()}"},
                )

                if response.status_code == 200:
                    logger.info(f"Annotation {annotation.id} synced successfully")
                else:
                    logger.error(
                        f"Failed to sync annotation {annotation.id}: {response.text}"
                    )

            except Exception as e:
                logger.error(f"Error syncing annotation {annotation.id}: {str(e)}")

    async def _sync_project_images(self, project_id: str, db: Session):
        """Sync project images"""
        images = db.query(ImageData).filter(ImageData.project_id == project_id).all()

        for image in images:
            try:
                image_data = {
                    "id": image.id,
                    "project_id": image.project_id,
                    "filename": image.filename,
                    "file_path": image.file_path,
                    "width": image.width,
                    "height": image.height,
                    "created_at": (
                        image.created_at.isoformat() if image.created_at else None
                    ),
                    "updated_at": (
                        image.updated_at.isoformat() if image.updated_at else None
                    ),
                }

                response = await self.client.post(
                    f"{self.cloud_api_url}/api/v1/images/sync",
                    json=image_data,
                    headers={"Authorization": f"Bearer {self._get_auth_token()}"},
                )

                if response.status_code == 200:
                    logger.info(f"Image {image.id} synced successfully")
                else:
                    logger.error(f"Failed to sync image {image.id}: {response.text}")

            except Exception as e:
                logger.error(f"Error syncing image {image.id}: {str(e)}")

    async def _sync_project_labels(self, project_id: str, db: Session):
        """Sync project labels"""
        labels = db.query(Label).filter(Label.project_id == project_id).all()

        for label in labels:
            try:
                label_data = {
                    "id": label.id,
                    "project_id": label.project_id,
                    "name": label.name,
                    "color": label.color,
                    "created_at": (
                        label.created_at.isoformat() if label.created_at else None
                    ),
                    "updated_at": (
                        label.updated_at.isoformat() if label.updated_at else None
                    ),
                }

                response = await self.client.post(
                    f"{self.cloud_api_url}/api/v1/labels/sync",
                    json=label_data,
                    headers={"Authorization": f"Bearer {self._get_auth_token()}"},
                )

                if response.status_code == 200:
                    logger.info(f"Label {label.id} synced successfully")
                else:
                    logger.error(f"Failed to sync label {label.id}: {response.text}")

            except Exception as e:
                logger.error(f"Error syncing label {label.id}: {str(e)}")

    async def _sync_project_tasks(self, project_id: str, db: Session):
        """Sync project tasks"""
        tasks = db.query(Task).filter(Task.project_id == project_id).all()

        for task in tasks:
            try:
                task_data = {
                    "id": task.id,
                    "project_id": task.project_id,
                    "name": task.name,
                    "description": task.description,
                    "status": task.status,
                    "created_at": (
                        task.created_at.isoformat() if task.created_at else None
                    ),
                    "updated_at": (
                        task.updated_at.isoformat() if task.updated_at else None
                    ),
                }

                response = await self.client.post(
                    f"{self.cloud_api_url}/api/v1/tasks/sync",
                    json=task_data,
                    headers={"Authorization": f"Bearer {self._get_auth_token()}"},
                )

                if response.status_code == 200:
                    logger.info(f"Task {task.id} synced successfully")
                else:
                    logger.error(f"Failed to sync task {task.id}: {response.text}")

            except Exception as e:
                logger.error(f"Error syncing task {task.id}: {str(e)}")

    async def _sync_ai_model(self, model: AIModel, db: Session):
        """Sync AI model to cloud"""
        try:
            model_data = {
                "id": model.id,
                "user_id": model.user_id,
                "name": model.name,
                "type": model.type,
                "config": model.config,
                "created_at": (
                    model.created_at.isoformat() if model.created_at else None
                ),
                "updated_at": (
                    model.updated_at.isoformat() if model.updated_at else None
                ),
            }

            response = await self.client.post(
                f"{self.cloud_api_url}/api/v1/ai-models/sync",
                json=model_data,
                headers={"Authorization": f"Bearer {self._get_auth_token()}"},
            )

            if response.status_code == 200:
                logger.info(f"AI Model {model.id} synced successfully")
            else:
                logger.error(f"Failed to sync AI model {model.id}: {response.text}")

        except Exception as e:
            logger.error(f"Error syncing AI model {model.id}: {str(e)}")

    async def _sync_settings(self, setting: AppSettings, db: Session):
        """Sync settings to cloud"""
        try:
            setting_data = {
                "id": setting.id,
                "user_id": setting.user_id,
                "key": setting.key,
                "value": setting.value,
                "created_at": (
                    setting.created_at.isoformat() if setting.created_at else None
                ),
                "updated_at": (
                    setting.updated_at.isoformat() if setting.updated_at else None
                ),
            }

            response = await self.client.post(
                f"{self.cloud_api_url}/api/v1/settings/sync",
                json=setting_data,
                headers={"Authorization": f"Bearer {self._get_auth_token()}"},
            )

            if response.status_code == 200:
                logger.info(f"Setting {setting.id} synced successfully")
            else:
                logger.error(f"Failed to sync setting {setting.id}: {response.text}")

        except Exception as e:
            logger.error(f"Error syncing setting {setting.id}: {str(e)}")

    def _get_auth_token(self) -> str:
        """Get authentication token for cloud API"""
        # This should be implemented based on your auth system
        # For now, return a placeholder
        return "your-auth-token"

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global instance
cloud_sync_service = CloudSyncService()
