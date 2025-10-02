# API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [OpenAPI Configuration](#openapi-configuration)

---

## Overview

Base URL: `http://localhost:8000/api/v1`

All endpoints return JSON responses and follow RESTful conventions.

---

## Authentication

### OAuth2 Token Authentication

Most endpoints require authentication using Bearer tokens.

#### Login Endpoint

**POST** `/api/v1/auth/token`

Get an access token using username and password.

**Request Body (Form Data):**
```
username: user@example.com
password: yourpassword
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Example (cURL):**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=yourpassword"
```

#### Using the Token

Include the token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Social Authentication

#### GitHub Login

**GET** `/api/v1/auth/social/login/github`

Redirects to GitHub OAuth authorization page.

**Response:** HTTP 302 redirect to GitHub

#### GitHub Callback

**GET** `/api/v1/auth/social/callback/github`

Handles GitHub OAuth callback and returns access token.

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Google Login

**GET** `/api/v1/auth/social/login/google`

Redirects to Google OAuth authorization page.

**Response:** HTTP 302 redirect to Google

#### Google Callback

**GET** `/api/v1/auth/social/callback/google`

Handles Google OAuth callback and returns access token.

---

## Endpoints

### Auth Endpoints

#### Get Current User

**GET** `/api/v1/auth/me`

**Authentication:** Required

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Admin Only Endpoint

**GET** `/api/v1/auth/admin`

**Authentication:** Required (Admin role only)

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "admin@example.com",
  "name": "Admin User",
  "role": "admin",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Response (403):**
```json
{
  "detail": "Not enough permissions"
}
```

---

### Projects

#### List All Projects

**GET** `/api/v1/projects/`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "proj-001",
    "name": "Image Classification",
    "description": "Classify images into categories",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Project by ID

**GET** `/api/v1/projects/{project_id}`

**Authentication:** Required

**Response:**
```json
{
  "id": "proj-001",
  "name": "Image Classification",
  "description": "Classify images into categories",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Error Response (404):**
```json
{
  "detail": "Project not found"
}
```

#### Create Project

**POST** `/api/v1/projects/`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description"
}
```

**Response (201):**
```json
{
  "id": "proj-002",
  "name": "New Project",
  "description": "Project description",
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

#### Update Project

**PUT** `/api/v1/projects/{project_id}`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": "proj-001",
  "name": "Updated Project Name",
  "description": "Updated description",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

#### Delete Project

**DELETE** `/api/v1/projects/{project_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "Project deleted"
}
```

---

### Images

#### Get Images by Project

**GET** `/api/v1/images/project/{project_id}`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "img-001",
    "project_id": "proj-001",
    "filename": "image1.jpg",
    "file_path": "/uploads/image1.jpg",
    "status": "annotated",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Image by ID

**GET** `/api/v1/images/{image_id}`

**Authentication:** Required

**Response:**
```json
{
  "id": "img-001",
  "project_id": "proj-001",
  "filename": "image1.jpg",
  "file_path": "/uploads/image1.jpg",
  "status": "annotated",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Create Image

**POST** `/api/v1/images/`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "proj-001",
  "filename": "new_image.jpg",
  "file_path": "/uploads/new_image.jpg"
}
```

**Response:**
```json
{
  "id": "img-002",
  "project_id": "proj-001",
  "filename": "new_image.jpg",
  "file_path": "/uploads/new_image.jpg",
  "status": "pending",
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Update Image

**PUT** `/api/v1/images/{image_id}`

**Authentication:** Required

**Request Body:**
```json
{
  "status": "annotated"
}
```

#### Delete Image

**DELETE** `/api/v1/images/{image_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "Image deleted"
}
```

---

### Annotations

#### Get Annotations by Project

**GET** `/api/v1/annotations/project/{project_id}`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "ann-001",
    "image_id": "img-001",
    "label_id": "label-001",
    "coordinates": {"x": 100, "y": 150, "width": 200, "height": 150},
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Annotations by Image

**GET** `/api/v1/annotations/image/{image_id}`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "ann-001",
    "image_id": "img-001",
    "label_id": "label-001",
    "coordinates": {"x": 100, "y": 150, "width": 200, "height": 150},
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Annotation

**POST** `/api/v1/annotations/`

**Authentication:** Required

**Request Body:**
```json
{
  "image_id": "img-001",
  "label_id": "label-001",
  "coordinates": {"x": 100, "y": 150, "width": 200, "height": 150}
}
```

**Response:**
```json
{
  "id": "ann-002",
  "image_id": "img-001",
  "label_id": "label-001",
  "coordinates": {"x": 100, "y": 150, "width": 200, "height": 150},
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Update Annotation

**PUT** `/api/v1/annotations/{annotation_id}`

**Authentication:** Required

**Request Body:**
```json
{
  "coordinates": {"x": 120, "y": 160, "width": 220, "height": 170}
}
```

#### Delete Annotation

**DELETE** `/api/v1/annotations/{annotation_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "Annotation deleted"
}
```

---

### Labels

#### Get Labels by Project

**GET** `/api/v1/labels/project/{project_id}`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "label-001",
    "project_id": "proj-001",
    "name": "Cat",
    "color": "#FF5733",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Label

**POST** `/api/v1/labels/`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "proj-001",
  "name": "Dog",
  "color": "#3357FF"
}
```

**Response:**
```json
{
  "id": "label-002",
  "project_id": "proj-001",
  "name": "Dog",
  "color": "#3357FF",
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Update Label

**PUT** `/api/v1/labels/{label_id}`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Label",
  "color": "#00FF00"
}
```

#### Delete Label

**DELETE** `/api/v1/labels/{label_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "Label deleted"
}
```

---

### Tasks

#### Get All Tasks

**GET** `/api/v1/tasks/`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "task-001",
    "project_id": "proj-001",
    "title": "Annotate batch 1",
    "status": "in_progress",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Task by ID

**GET** `/api/v1/tasks/{task_id}`

**Authentication:** Required

**Response:**
```json
{
  "id": "task-001",
  "project_id": "proj-001",
  "title": "Annotate batch 1",
  "status": "in_progress",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Get Tasks by Project

**GET** `/api/v1/tasks/project/{project_id}`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "task-001",
    "project_id": "proj-001",
    "title": "Annotate batch 1",
    "status": "in_progress",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Task

**POST** `/api/v1/tasks/`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "proj-001",
  "title": "New annotation task",
  "status": "pending"
}
```

**Response:**
```json
{
  "id": "task-002",
  "project_id": "proj-001",
  "title": "New annotation task",
  "status": "pending",
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Update Task

**PUT** `/api/v1/tasks/{task_id}`

**Authentication:** Required

**Request Body:**
```json
{
  "status": "completed"
}
```

#### Delete Task

**DELETE** `/api/v1/tasks/{task_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "Task deleted"
}
```

---

### AI Models

#### Get AI Model by ID

**GET** `/api/v1/ai-models/{model_id}`

**Authentication:** Required

**Response:**
```json
{
  "id": "model-001",
  "project_id": "proj-001",
  "name": "ResNet50",
  "version": "1.0",
  "accuracy": 0.95,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Get Models by Project

**GET** `/api/v1/ai-models/project/{project_id}`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "model-001",
    "project_id": "proj-001",
    "name": "ResNet50",
    "version": "1.0",
    "accuracy": 0.95,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create AI Model

**POST** `/api/v1/ai-models/`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "proj-001",
  "name": "VGG16",
  "version": "1.0"
}
```

**Response:**
```json
{
  "id": "model-002",
  "project_id": "proj-001",
  "name": "VGG16",
  "version": "1.0",
  "accuracy": null,
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Update AI Model

**PUT** `/api/v1/ai-models/{model_id}`

**Authentication:** Required

**Request Body:**
```json
{
  "accuracy": 0.97
}
```

#### Delete AI Model

**DELETE** `/api/v1/ai-models/{model_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "Model deleted"
}
```

---

### History

#### Get Project History

**GET** `/api/v1/history/project/{project_id}`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "hist-001",
    "project_id": "proj-001",
    "action": "create",
    "entity_type": "annotation",
    "entity_id": "ann-001",
    "user_id": "user-001",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create History Record

**POST** `/api/v1/history/`

**Authentication:** Required

**Request Body:**
```json
{
  "project_id": "proj-001",
  "action": "update",
  "entity_type": "image",
  "entity_id": "img-001",
  "user_id": "user-001"
}
```

**Response:**
```json
{
  "id": "hist-002",
  "project_id": "proj-001",
  "action": "update",
  "entity_type": "image",
  "entity_id": "img-001",
  "user_id": "user-001",
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Update History Record

**PUT** `/api/v1/history/{history_id}`

**Authentication:** Required

**Request Body:**
```json
{
  "action": "delete"
}
```

#### Delete History Record

**DELETE** `/api/v1/history/{history_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "History deleted"
}
```

---

### Settings

#### Get All Settings

**GET** `/api/v1/settings/`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "setting-001",
    "key": "max_upload_size",
    "value": "10485760",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create or Update Setting

**POST** `/api/v1/settings/`

**Authentication:** Required

**Request Body:**
```json
{
  "key": "max_upload_size",
  "value": "20971520"
}
```

**Response:**
```json
{
  "id": "setting-001",
  "key": "max_upload_size",
  "value": "20971520",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

#### Delete Setting

**DELETE** `/api/v1/settings/{setting_id}`

**Authentication:** Required

**Response:**
```json
{
  "message": "Setting deleted"
}
```

---

### Users

#### List All Users

**GET** `/api/v1/users/`

**Authentication:** Required (Admin only)

**Response:**
```json
[
  {
    "id": "user-001",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create User

**POST** `/api/v1/users/`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "password": "securepassword",
  "role": "user"
}
```

**Response:**
```json
{
  "id": "user-002",
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "role": "user",
  "created_at": "2024-01-15T11:00:00Z"
}
```

#### Update User

**PUT** `/api/v1/users/{user_id}`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "role": "admin"
}
```

**Response:**
```json
{
  "id": "user-002",
  "email": "newuser@example.com",
  "name": "Jane Doe",
  "role": "admin",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

#### Delete User

**DELETE** `/api/v1/users/{user_id}`

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "message": "User deleted"
}
```

---

## OpenAPI Configuration

The API uses `openapi_config.py` to customize the OpenAPI (Swagger) documentation.

### Accessing Interactive Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### Configuration Options

The `openapi_config.py` file allows you to customize:

1. **API Metadata**: Title, description, version
2. **Contact Information**: Developer contact details
3. **License**: API license information
4. **Tags**: Organize endpoints into groups
5. **Security Schemes**: Define authentication methods

### Example Usage

```python
from fastapi import FastAPI
from openapi_config import custom_openapi

app = FastAPI()

# Apply custom OpenAPI configuration
app.openapi = lambda: custom_openapi(app)
```

### Customizing OpenAPI Schema

To modify the OpenAPI schema, edit `openapi_config.py`:

```python
def custom_openapi(app):
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Your API Title",
        version="1.0.0",
        description="Your API Description",
        routes=app.routes,
    )
    
    # Add custom security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema
```

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "detail": "Error message description"
}
```

### Common Status Codes

- **200 OK**: Request succeeded
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error

### Example Error Responses

**401 Unauthorized:**
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden:**
```json
{
  "detail": "Not enough permissions"
}
```

**404 Not Found:**
```json
{
  "detail": "Project not found"
}
```

**422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Rate Limiting

Currently, there are no rate limits enforced. Future versions may implement rate limiting for API stability.

---

## Versioning

The API uses URL versioning: `/api/v1/`

Future versions will be available at `/api/v2/`, etc.

---

## Support

For questions or issues:
- Check the interactive documentation at `/docs`
- Review this documentation
- Contact the development team