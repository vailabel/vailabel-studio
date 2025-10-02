# 🤝 Contributing to Vailabel API

Thank you for your interest in contributing to the Vailabel API! This guide will help you get started with development, testing, and contributing to our FastAPI backend service.

## 📋 Table of Contents

- [Development Environment Setup](#️-development-environment-setup)
- [Branching and PR Conventions](#-branching-and-pr-conventions)
- [Running Tests](#-running-tests)
- [Writing and Structuring New Endpoints](#-writing-and-structuring-new-endpoints)
- [Code Standards](#-code-standards)
- [Getting Help](#-getting-help)

## 🛠️ Development Environment Setup

### Prerequisites

- **Python 3.11+** installed
- **pip** package manager
- **Virtual environment** support
- **Git** for version control

### Step-by-Step Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/vailabel/vailabel-studio.git
   cd vailabel-studio/apps/api
   ```

2. **Create Virtual Environment**
   ```bash
   # Create virtual environment
   python -m venv .venv
   
   # Activate virtual environment
   # On Windows
   .venv\Scripts\activate
   # On macOS/Linux
   source .venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   ```bash
   # Copy example config
   cp config.env.example .env
   
   # Edit .env file with your settings
   # Add your database URL, secret keys, etc.
   ```

5. **Database Setup**
   ```bash
   # Run database migrations
   alembic upgrade head
   
   # Seed initial data (optional)
   python scripts/seed_all.py
   ```

6. **Verify Setup**
   ```bash
   # Start development server
   make dev
   # or
   uvicorn main:app --reload
   
   # Visit http://localhost:8000/docs for API documentation
   ```

### Development Scripts

Use the provided scripts for common tasks:

```bash
# Start development server
bash scripts/dev.sh

# Format code
bash scripts/format.sh

# Run tests
bash scripts/test.sh

# Type checking
bash scripts/typecheck.sh
```

## 🌿 Branching and PR Conventions

### Branch Naming

Use descriptive branch names following this pattern:

```bash
# Feature branches
feature/add-user-authentication
feature/implement-project-export
feature/ai-model-integration

# Bug fixes
fix/resolve-login-issue
fix/correct-annotation-validation
fix/database-migration-error

# Documentation
docs/update-api-documentation
docs/add-contributing-guide

# Refactoring
refactor/reorganize-services
refactor/optimize-database-queries
```

### Commit Message Format

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(auth): add OAuth2 authentication with JWT tokens"
git commit -m "fix(projects): resolve project deletion cascade issue"
git commit -m "docs(api): update endpoint documentation with examples"
git commit -m "test(users): add comprehensive user service tests"
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, readable code
   - Follow existing patterns
   - Add tests for new functionality

3. **Test Your Changes**
   ```bash
   # Run all tests
   pytest
   
   # Run with coverage
   pytest --cov=./ --cov-report=html
   
   # Format code
   bash scripts/format.sh
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use descriptive title
   - Include summary of changes
   - Reference related issues
   - Add screenshots if UI changes

### PR Template

```markdown
## Summary
Brief description of what this PR does.

## Changes Made
- List of specific changes
- New features added
- Bug fixes included

## Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Documentation
- [ ] Code documented with docstrings
- [ ] API documentation updated if needed
```

## 🧪 Running Tests

### Test Configuration

Our tests are configured using `pytest.ini` with the following settings:

```ini
[tool:pytest]
addopts = --strict-markers --disable-warnings
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

### Test Structure

```
tests/
├── conftest.py          # Test fixtures and configuration
├── test_main.py         # Main application tests
├── api/                 # API endpoint tests
│   ├── test_auth.py
│   ├── test_projects.py
│   └── test_users.py
├── db/                  # Database model tests
├── repositories/        # Repository layer tests
└── services/            # Service layer tests
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/api/test_projects.py

# Run with coverage report
pytest --cov=./ --cov-report=html

# Run tests and stop on first failure
pytest --maxfail=1

# Run tests with verbose output
pytest -v

# Run specific test function
pytest tests/api/test_projects.py::test_create_project
```

### Writing Tests

#### API Endpoint Tests

```python
def test_create_project(client, test_user):
    """Test creating a new project."""
    project_data = {
        "name": "Test Project",
        "description": "A test project"
    }
    
    response = client.post(
        "/api/v1/projects/",
        json=project_data,
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    
    assert response.status_code == 201
    assert response.json()["name"] == "Test Project"
```

#### Service Layer Tests

```python
def test_project_service_create(db_session):
    """Test project service creation logic."""
    service = ProjectService(db_session)
    project_data = ProjectCreate(name="Test", description="Test desc")
    
    project = service.create_project(project_data, user_id=1)
    
    assert project.name == "Test"
    assert project.user_id == 1
```

### Test Fixtures

Use fixtures from `conftest.py`:

```python
def test_with_fixtures(client, db_session, test_user, test_project):
    """Example test using multiple fixtures."""
    # Your test code here
    pass
```

## 🔗 Writing and Structuring New Endpoints

### Endpoint Development Pattern

Follow this layered approach for new endpoints:

1. **Define Pydantic Models** (`models/`)
2. **Create Repository** (`repositories/`)
3. **Implement Service** (`services/`)
4. **Create API Router** (`api/v1/`)
5. **Add Tests** (`tests/`)

### Step 1: Pydantic Models

```python
# models/project.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    user_id: int
    
    class Config:
        from_attributes = True
```

### Step 2: Repository Layer

```python
# repositories/project_repository.py
from repositories.base_repository import BaseRepository
from db.models.project import Project
from typing import List, Optional

class ProjectRepository(BaseRepository[Project]):
    """Project data access repository."""
    
    def find_by_user_id(self, user_id: int) -> List[Project]:
        """Find all projects for a specific user."""
        return self.db.query(Project).filter(
            Project.user_id == user_id
        ).all()
    
    def find_by_name(self, name: str, user_id: int) -> Optional[Project]:
        """Find project by name for a specific user."""
        return self.db.query(Project).filter(
            Project.name == name,
            Project.user_id == user_id
        ).first()
```

### Step 3: Service Layer

```python
# services/project_service.py
from services.base_service import BaseService
from repositories.project_repository import ProjectRepository
from models.project import ProjectCreate, ProjectUpdate
from fastapi import HTTPException, status

class ProjectService(BaseService):
    """Project business logic service."""
    
    def __init__(self, db: Session):
        self.project_repo = ProjectRepository(db)
    
    def create_project(self, project_data: ProjectCreate, user_id: int):
        """Create a new project with validation."""
        # Check if project name already exists
        existing = self.project_repo.find_by_name(
            project_data.name, user_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project name already exists"
            )
        
        # Create project
        project_dict = project_data.dict()
        project_dict['user_id'] = user_id
        
        return self.project_repo.create(project_dict)
```

### Step 4: API Router

```python
# api/v1/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session

from db.session import get_db
from models.project import ProjectCreate, ProjectResponse, ProjectUpdate
from services.project_service import ProjectService
from api.v1.auth import get_current_user
from db.models.user import User

router = APIRouter(prefix="/projects", tags=["Projects"])

def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    return ProjectService(db)

@router.post("/", response_model=ProjectResponse, status_code=201)
def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """Create a new project."""
    return service.create_project(project, current_user.id)

@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    current_user: User = Depends(get_current_user),
    service: ProjectService = Depends(get_project_service)
):
    """Get all projects for the current user."""
    return service.get_user_projects(current_user.id)
```

### Error Handling Standards

```python
# Use consistent HTTP status codes
from fastapi import HTTPException, status

# Not found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Project not found"
)

# Validation error
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid project data"
)

# Permission error
raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Not authorized to access this project"
)
```

## 📏 Code Standards

### Python Style Guide

- Follow **PEP 8** conventions
- Use **Black** for code formatting
- Maximum line length: **88 characters**
- Use **type hints** for all functions
- Write **descriptive docstrings**

### Code Formatting

```bash
# Format code with Black
black .

# Check formatting
black --check .

# Use the format script
bash scripts/format.sh
```

### Import Organization

```python
# Standard library
from typing import List, Optional
from datetime import datetime

# Third-party
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Local
from db.session import get_db
from models.project import ProjectCreate
from services.project_service import ProjectService
```

## 🆘 Getting Help

### Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **pytest Documentation**: https://docs.pytest.org/

### Support

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions and get help
- **Email**: support@vailabel.com

---

## 🎉 Thank You!

Thank you for contributing to Vailabel API! Your contributions help make this project better for everyone.

---

<div align="center">
  <strong>Happy Contributing! 🚀</strong>
  <br>
  <em>Made with ❤️ by the Vailabel Community</em>
</div>