# Import all models to ensure they are registered with SQLAlchemy
from .user import User
from .project import Project
from .label import Label
from .annotation import Annotation
from .image_data import ImageData
from .task import Task
from .ai_model import AIModel
from .settings import Settings
from .history import History
from .permission import Permission, Role
from .associations import user_permissions, role_permissions

__all__ = [
    "User",
    "Project",
    "Label",
    "Annotation",
    "ImageData",
    "Task",
    "AIModel",
    "Settings",
    "History",
    "Permission",
    "Role",
    "user_permissions",
    "role_permissions",
]
