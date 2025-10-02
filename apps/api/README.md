# 🚀 Vailabel API

> A powerful FastAPI-based backend service for managing annotation projects, labels, images, and AI models in the Vailabel Studio ecosystem.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Development Setup](#️-development-setup)
- [API Documentation](#-api-documentation)
- [Database](#️-database)
- [Testing](#-testing)
- [Docker Support](#-docker-support)
- [Scripts](#-scripts)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Support](#-support)

## 🎯 Overview

The Vailabel API is the core backend service that powers the Vailabel Studio platform. Built with FastAPI, it provides a robust, scalable, and well-documented REST API for managing:

- **Annotation Projects**: Create and manage computer vision annotation projects
- **Image Management**: Upload, process, and organize image datasets
- **Label Management**: Define and manage annotation labels and categories
- **Task Management**: Distribute and track annotation tasks
- **AI Model Integration**: Integrate and manage AI models for automated annotation
- **User Authentication**: Secure user management with OAuth support
- **Project History**: Track changes and maintain project history

## ✨ Features

### Core Features
- 🔐 **Authentication & Authorization** - JWT-based auth with social login (GitHub, Google)
- 👥 **User Management** - Complete user lifecycle management
- 📁 **Project Management** - Create, update, and organize annotation projects
- 🖼️ **Image Processing** - Upload, store, and manage image datasets
- 🏷️ **Label Management** - Define custom labels and categories
- ✅ **Task Management** - Distribute and track annotation tasks
- 🤖 **AI Model Integration** - Connect and manage AI models
- 📊 **History Tracking** - Comprehensive audit trail
- ⚙️ **Settings Management** - Configurable application settings

### Technical Features
- 🔄 **Auto-generated OpenAPI Documentation**
- 🗄️ **SQLAlchemy ORM with Alembic Migrations**
- 🧪 **Comprehensive Test Suite**
- 🐳 **Docker Support**
- 🔧 **Development Tools** (formatting, linting, type checking)
- 📝 **Request/Response Validation with Pydantic**

## 🏗️ Architecture

```
apps/api/
├── api/v1/          # API route handlers
├── db/              # Database configuration and models
├── models/          # Pydantic models for request/response
├── repositories/    # Data access layer
├── services/        # Business logic layer
├── tests/           # Test suite
└── scripts/         # Development scripts
```

The API follows a clean architecture pattern with clear separation of concerns:
- **API Layer**: FastAPI routers and endpoint definitions
- **Service Layer**: Business logic and orchestration
- **Repository Layer**: Data access and database operations
- **Model Layer**: Data validation and serialization

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+** 🐍
- **pip** (Python package manager)
- **Virtual Environment** (recommended)
- **SQLite** (for local development)
- **Git** (for version control)

### Optional but Recommended
- **Docker** 🐳 (for containerized development)
- **Make** (for using Makefile commands)

## 🚀 Quick Start

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd vailabel-studio_hacktoberfest/apps/api
```

### 2. Set Up Environment
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the API
```bash
# Using Makefile (recommended)
make dev

# Or using uvicorn directly
uvicorn main:app --reload

# Or using npm script
npm run dev:api
```

### 4. Access the API
- **API Server**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🛠️ Development Setup

### Using the Development Script
The easiest way to get started is using our development script:

```bash
# Make script executable (macOS/Linux)
chmod +x scripts/dev.sh

# Run development script
bash scripts/dev.sh
```

This script will:
1. Create a virtual environment if it doesn't exist
2. Activate the virtual environment
3. Install all dependencies
4. Start the development server with hot reload

### Manual Setup
If you prefer manual setup:

```bash
# 1. Create virtual environment
python -m venv .venv

# 2. Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate     # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run database migrations
alembic upgrade head

# 5. Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables
Create a `.env` file in the API root directory:

```env
# Database
DATABASE_URL=sqlite:///./db.sqlite3

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS
FRONTEND_URL=http://localhost:5173
```

## 📚 API Documentation

### Interactive Documentation
Once the server is running, you can access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### API Endpoints Overview

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

#### Social Authentication
- `GET /oauth/github` - GitHub OAuth login
- `GET /oauth/google` - Google OAuth login

#### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project by ID
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project

#### Images
- `POST /images/upload` - Upload images
- `GET /images` - List images
- `GET /images/{id}` - Get image by ID
- `DELETE /images/{id}` - Delete image

#### And many more endpoints for labels, tasks, annotations, AI models, etc.

## 🗄️ Database

### Database Setup
The API uses SQLite for development and supports PostgreSQL for production.

#### Migrations
We use Alembic for database migrations:

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback to previous migration
alembic downgrade -1

# Check current migration status
alembic current
```

#### Database Models
Key database models include:
- **User**: User authentication and profile data
- **Project**: Annotation project information
- **Image**: Image metadata and storage info
- **Label**: Label definitions and categories
- **Annotation**: Annotation data and relationships
- **Task**: Task assignment and tracking
- **AIModel**: AI model metadata and configuration

## 🧪 Testing

### Running Tests
```bash
# Run all tests
make test

# Or using pytest directly
pytest

# Run with coverage report
pytest --cov=./ --cov-report=html

# Run specific test file
pytest tests/api/test_projects.py

# Run tests with verbose output
pytest -v

# Run tests and stop on first failure
pytest --maxfail=1
```

### Test Structure
```
tests/
├── api/              # API endpoint tests
├── db/              # Database model tests
├── repositories/    # Repository layer tests
├── services/        # Service layer tests
├── conftest.py      # Test configuration
└── test_main.py     # Main application tests
```

### Writing Tests
Tests are written using pytest and follow these conventions:
- Test files are prefixed with `test_`
- Test functions are prefixed with `test_`
- Use fixtures for common setup
- Mock external dependencies

Example test:
```python
def test_create_project(client, test_user):
    response = client.post(
        "/projects",
        json={"name": "Test Project", "description": "Test description"},
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Project"
```

## 🐳 Docker Support

### Using Docker
```bash
# Build the Docker image
docker build -t vailabel-api .

# Run the container
docker run -p 8000:8000 vailabel-api

# Run with environment variables
docker run -p 8000:8000 -e DATABASE_URL=sqlite:///./app.db vailabel-api
```

### Docker Compose (if available in parent directory)
```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down
```

## 📜 Scripts

The `scripts/` directory contains helpful development scripts:

### Available Scripts
```bash
# Development server with auto-reload
bash scripts/dev.sh

# Format code with black
bash scripts/format.sh

# Run tests with coverage
bash scripts/test.sh

# Type checking with pyright
bash scripts/typecheck.sh
```

### NPM Scripts
You can also use npm scripts defined in `package.json`:
```bash
npm run dev:api      # Start development server
npm run test         # Run tests
npm run format       # Format code
npm run typecheck    # Type checking
```

## 📁 Project Structure

```
apps/api/
├── 📄 main.py                    # FastAPI application entry point
├── 📄 requirements.txt           # Python dependencies
├── 📄 package.json              # Node.js scripts and metadata
├── 📄 Dockerfile               # Docker configuration
├── 📄 Makefile                 # Make commands for development
├── 📄 pytest.ini              # Pytest configuration
├── 📄 alembic.ini              # Alembic configuration
├── 📄 openapi_config.py        # OpenAPI documentation config
├── 📄 exception_handlers.py    # Global exception handlers
│
├── 📁 api/v1/                   # API version 1 endpoints
│   ├── 📄 auth.py              # Authentication endpoints
│   ├── 📄 users.py             # User management endpoints
│   ├── 📄 projects.py          # Project management endpoints
│   ├── 📄 images.py            # Image management endpoints
│   ├── 📄 labels.py            # Label management endpoints
│   ├── 📄 annotations.py       # Annotation endpoints
│   ├── 📄 tasks.py             # Task management endpoints
│   ├── 📄 ai_models.py         # AI model endpoints
│   ├── 📄 history.py           # History tracking endpoints
│   ├── 📄 settings.py          # Settings endpoints
│   └── 📄 oauth.py             # OAuth social login endpoints
│
├── 📁 db/                       # Database configuration
│   ├── 📄 __init__.py
│   ├── 📄 base.py              # Database base configuration
│   ├── 📄 session.py           # Database session management
│   └── 📁 models/              # SQLAlchemy database models
│       ├── 📄 user.py
│       ├── 📄 project.py
│       ├── 📄 image_data.py
│       └── 📄 ...
│
├── 📁 models/                   # Pydantic models
│   ├── 📄 base.py              # Base model classes
│   ├── 📄 user.py              # User models
│   ├── 📄 project.py           # Project models
│   └── 📄 ...
│
├── 📁 repositories/             # Data access layer
│   ├── 📄 base_repository.py   # Base repository class
│   ├── 📄 user_repository.py   # User data access
│   ├── 📄 project_repository.py # Project data access
│   └── 📄 ...
│
├── 📁 services/                 # Business logic layer
│   ├── 📄 auth_service.py      # Authentication business logic
│   ├── 📄 user_service.py      # User business logic
│   ├── 📄 project_service.py   # Project business logic
│   └── 📄 ...
│
├── 📁 alembic/                  # Database migrations
│   ├── 📄 env.py               # Alembic environment
│   ├── 📄 script.py.mako       # Migration template
│   └── 📁 versions/            # Migration files
│
├── 📁 scripts/                  # Development scripts
│   ├── 📄 dev.sh               # Development server script
│   ├── 📄 format.sh            # Code formatting script
│   ├── 📄 test.sh              # Test execution script
│   └── 📄 typecheck.sh         # Type checking script
│
└── 📁 tests/                    # Test suite
    ├── 📄 conftest.py          # Test configuration
    ├── 📄 test_main.py         # Main application tests
    ├── 📁 api/                 # API endpoint tests
    ├── 📁 db/                  # Database tests
    ├── 📁 repositories/        # Repository tests
    └── 📁 services/            # Service tests
```

## 🔧 Configuration

### Key Configuration Files
- **`main.py`**: FastAPI application setup and configuration
- **`openapi_config.py`**: API documentation configuration
- **`requirements.txt`**: Python dependencies
- **`alembic.ini`**: Database migration configuration
- **`pytest.ini`**: Test configuration
- **`Dockerfile`**: Container configuration

### CORS Configuration
The API is configured to allow requests from:
- `https://studio.vailabel.app` (production frontend)
- `http://localhost:5173` (local development frontend)

## 🚀 Deployment

### Production Deployment
For production deployment, consider:

1. **Environment Variables**: Set production environment variables
2. **Database**: Use PostgreSQL instead of SQLite
3. **Security**: Use strong secret keys and enable HTTPS
4. **Monitoring**: Set up logging and monitoring
5. **Scaling**: Consider using multiple workers

### Using Docker in Production
```bash
# Build for production
docker build -t vailabel-api:latest .

# Run with production settings
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e SECRET_KEY=your-production-secret \
  vailabel-api:latest
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Follow PEP 8 Python style guide
- Use Black for code formatting
- Add type hints where possible
- Write descriptive commit messages

### Common Issues
1. **Import Errors**: Make sure virtual environment is activated
2. **Database Errors**: Run `alembic upgrade head` to apply migrations
3. **Permission Errors**: Check file permissions for database files
4. **Port Conflicts**: Change the port using `--port` flag

### Troubleshooting
```bash
# Check Python version
python --version

# Verify dependencies
pip list

# Check database status
alembic current

# Run in debug mode
uvicorn main:app --reload --log-level debug
```
---

<div align="center">
  <strong>Happy Coding! 🚀</strong>
  <br>
  <em>Made with ❤️ by the Vailabel Team</em>
</div>