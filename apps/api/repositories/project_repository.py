from sqlalchemy.orm import Session
from typing import List
from db.models.project import Project as ProjectModel
from models.project import ProjectCreate, ProjectUpdate
from repositories.base_repository import BaseRepository


class ProjectRepository(BaseRepository):
    def __init__(self):
        super().__init__(ProjectModel)
