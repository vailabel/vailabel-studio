# 🤝 Contributing to Vailabel API


Thank you for your interest in contributing to the Vailabel API! This guide will help you get started with contributing to the FastAPI backend service that powers the Vailabel Studio platform.

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [Development Setup](#️-development-setup)
- [Code Standards](#-code-standards)
- [Project Structure](#-project-structure)
- [Making Changes](#-making-changes)
- [Testing Guidelines](#-testing-guidelines)
- [Database Changes](#️-database-changes)
- [API Development](#-api-development)
- [Pull Request Process](#-pull-request-process)
- [Code Review](#-code-review)
- [Common Issues](#-common-issues)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Python 3.11+** installed
- **Git** for version control
- Basic knowledge of **FastAPI**, **SQLAlchemy**, and **Python**
- Understanding of **REST API** principles
- Familiarity with **pytest** for testing

### First Time Setup

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/vailabel-studio.git
   cd vailabel-studio/apps/api
   ```

2. **Set Up Development Environment**
   ```bash
   # Create virtual environment
   python -m venv .venv
   
   # Activate virtual environment
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Set Up Database**
   ```bash
   # Run database migrations
   alembic upgrade head
   ```

4. **Verify Setup**
   ```bash
   # Run tests to ensure everything works
   pytest
   
   # Start development server
   uvicorn main:app --reload
   ```

## 🛠️ Development Setup

### Environment Configuration

Create a `.env` file in the `apps/api/` directory:

```env
# Database
DATABASE_URL=sqlite:///./db.sqlite3

# Security
SECRET_KEY=your-development-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Development settings
DEBUG=True
ENVIRONMENT=development

# OAuth (optional for development)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Development Scripts

Use the provided scripts for common development tasks:

```bash
# Start development server
bash scripts/dev.sh

# Format code
bash scripts/format.sh

# Run tests with coverage
bash scripts/test.sh

# Type checking
bash scripts/typecheck.sh
```

## 📏 Code Standards

### Python Style Guide

We follow **PEP 8** with some additional conventions:

- **Line Length**: Maximum 88 characters (Black formatter default)
- **Imports**: Use absolute imports, group them properly
- **Docstrings**: Use Google-style docstrings
- **Type Hints**: Required for all function signatures
- **Variable Names**: Use descriptive snake_case names

### Code Formatting

We use **Black** for automatic code formatting:

```bash
# Format all code
black .

# Check formatting without changes
black --check .
```

### Import Organization

Organize imports in this order:
1. Standard library imports
2. Third-party imports
3. Local application imports

```python
# Standard library
from typing import List, Optional
from datetime import datetime

# Third-party
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Local
from db.session import get_db
from models.project import ProjectCreate, ProjectResponse
from services.project_service import ProjectService
```

### Type Hints

Always use type hints for better code clarity:

```python
from typing import List, Optional

def get_projects(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> List[ProjectResponse]:
    """Get list of projects with pagination."""
    pass
```

## 📁 Project Structure

Understanding the project structure is crucial for contributing:

```
apps/api/
├── api/v1/          # API endpoints (routers)
├── db/              # Database configuration and models
├── models/          # Pydantic models (request/response)
├── repositories/    # Data access layer
├── services/        # Business logic layer
├── tests/           # Test suite
└── scripts/         # Development scripts
```

### Layer Responsibilities

- **API Layer** (`api/v1/`): Handle HTTP requests, validation, responses
- **Service Layer** (`services/`): Business logic, orchestration
- **Repository Layer** (`repositories/`): Database operations, queries
- **Model Layer** (`models/`): Data validation, serialization

## 🔄 Making Changes

### Branch Naming Convention

Use descriptive branch names:

```bash
# Feature branches
git checkout -b feature/add-user-authentication
git checkout -b feature/implement-project-export

# Bug fixes
git checkout -b fix/resolve-login-issue
git checkout -b fix/correct-annotation-validation

# Documentation
git checkout -b docs/update-api-documentation
git checkout -b docs/add-setup-guide
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
- `style`: Code style changes (formatting, etc.)
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

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, readable code
   - Follow the established patterns
   - Update tests as needed

3. **Test Your Changes**
   ```bash
   # Run all tests
   pytest
   
   # Run specific test file
   pytest tests/api/test_projects.py
   
   # Run with coverage
   pytest --cov=./ --cov-report=html
   ```

4. **Format Code**
   ```bash
   bash scripts/format.sh
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🧪 Testing Guidelines

### Test Structure

Follow the existing test structure:

```
tests/
├── api/              # API endpoint tests
├── db/              # Database model tests
├── repositories/    # Repository layer tests
├── services/        # Service layer tests
├── conftest.py      # Test fixtures and configuration
└── test_main.py     # Main application tests
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

#### Repository Tests

```python
def test_project_repository_find_by_user(db_session):
    """Test finding projects by user ID."""
    repo = ProjectRepository(db_session)
    
    projects = repo.find_by_user_id(user_id=1)
    
    assert isinstance(projects, list)
```

### Test Fixtures

Use fixtures from `conftest.py`:

```python
def test_with_fixtures(client, db_session, test_user, test_project):
    """Example test using multiple fixtures."""
    # Your test code here
    pass
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/api/test_projects.py

# Run tests with coverage
pytest --cov=./ --cov-report=html

# Run tests and stop on first failure
pytest --maxfail=1

# Run tests with verbose output
pytest -v
```

## 🗄️ Database Changes

### Creating Migrations

When you modify database models:

1. **Create Migration**
   ```bash
   alembic revision --autogenerate -m "Add user avatar field"
   ```

2. **Review Migration**
   - Check the generated migration file in `alembic/versions/`
   - Ensure it correctly represents your changes
   - Add any custom migration logic if needed

3. **Apply Migration**
   ```bash
   alembic upgrade head
   ```

4. **Test Migration**
   ```bash
   # Test rollback
   alembic downgrade -1
   
   # Test upgrade again
   alembic upgrade head
   ```

### Database Model Guidelines

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.base import Base

class Project(Base):
    """Project database model."""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    annotations = relationship("Annotation", back_populates="project")
```

## 🔗 API Development

### Creating New Endpoints

Follow this pattern for new API endpoints:

1. **Define Pydantic Models** (`models/`)
   ```python
   from pydantic import BaseModel
   from typing import Optional
   
   class ProjectCreate(BaseModel):
       name: str
       description: Optional[str] = None
   
   class ProjectResponse(BaseModel):
       id: int
       name: str
       description: Optional[str]
       
       class Config:
           from_attributes = True
   ```

2. **Create Repository** (`repositories/`)
   ```python
   from repositories.base_repository import BaseRepository
   from db.models.project import Project
   
   class ProjectRepository(BaseRepository[Project]):
       """Project data access repository."""
       
       def find_by_user_id(self, user_id: int) -> List[Project]:
           return self.db.query(Project).filter(
               Project.user_id == user_id
           ).all()
   ```

3. **Implement Service** (`services/`)
   ```python
   from services.base_service import BaseService
   from repositories.project_repository import ProjectRepository
   
   class ProjectService(BaseService):
       """Project business logic service."""
       
       def __init__(self, db: Session):
           self.project_repo = ProjectRepository(db)
       
       def create_project(self, project_data: ProjectCreate, user_id: int):
           # Business logic here
           pass
   ```

4. **Create API Router** (`api/v1/`)
   ```python
   from fastapi import APIRouter, Depends, HTTPException
   from services.project_service import ProjectService
   
   router = APIRouter(prefix="/projects", tags=["Projects"])
   
   @router.post("/", response_model=ProjectResponse)
   def create_project(
       project: ProjectCreate,
       service: ProjectService = Depends(get_project_service)
   ):
       """Create a new project."""
       return service.create_project(project)
   ```

### Error Handling

Use consistent error handling:

```python
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

## 📝 Pull Request Process

### Before Submitting

1. **Run All Checks**
   ```bash
   # Format code
   bash scripts/format.sh
   
   # Run tests
   bash scripts/test.sh
   
   # Type checking
   bash scripts/typecheck.sh
   ```

2. **Update Documentation**
   - Update docstrings for new functions
   - Update API documentation if needed
   - Add or update tests

3. **Test Thoroughly**
   - Test your changes manually
   - Ensure all existing tests pass
   - Add new tests for new functionality

### Pull Request Template

Use this template for your PR description:

```markdown
## Summary
Brief description of what this PR does.

## Changes Made
- List of specific changes
- Any new features added
- Bug fixes included

## Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Documentation
- [ ] Code documented with docstrings
- [ ] README updated if needed
- [ ] API documentation updated

## Screenshots (if applicable)
Include screenshots for UI changes.

## Additional Notes
Any additional context or considerations.
```

### Review Process

1. **Automated Checks**: Ensure all CI checks pass
2. **Code Review**: Address reviewer feedback promptly
3. **Testing**: Verify all tests pass
4. **Documentation**: Ensure documentation is complete


## 🔧 Common Issues

### Development Issues

**Issue**: Import errors
```bash
# Solution: Ensure virtual environment is activated
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

**Issue**: Database migration errors
```bash
# Solution: Reset database and migrations
rm db.sqlite3
alembic upgrade head
```

**Issue**: Test failures
```bash
# Solution: Run tests with verbose output
pytest -v
# Check specific failing test
pytest tests/path/to/test.py::test_function_name -v
```

### Code Quality Issues

**Issue**: Black formatting errors
```bash
# Solution: Auto-format code
black .
```

**Issue**: Type checking errors
```bash
# Solution: Add proper type hints
bash scripts/typecheck.sh
```

### Git Issues

**Issue**: Merge conflicts
```bash
# Solution: Rebase your branch
git fetch origin
git rebase origin/main
# Resolve conflicts, then
git rebase --continue
```

---

## 🎉 Thank You!

Thank you for contributing to Vailabel API! Your contributions help make this project better for everyone. We appreciate your time and effort in making the codebase more robust, feature-rich, and maintainable.

---

<div align="center">
  <strong>Happy Contributing! 🚀</strong>
  <br>
  <em>Made with ❤️ by the Vailabel Community</em>
</div>