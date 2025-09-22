# Python API Contract for VaiLabeling Studio

This document outlines the API contract that needs to be implemented in the Python backend to support the VaiLabeling Studio frontend.

## Base URL
- Development: `http://127.0.0.1:8000/api/v1`
- Production: `{YOUR_DOMAIN}/api/v1`

## Authentication
All API endpoints should support:
- Bearer token authentication
- Session-based authentication (optional)

## Data Models

### Project
```python
{
    "id": "string (UUID)",
    "name": "string",
    "description": "string (optional)",
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "images": "array of ImageData (optional)"
}
```

### Label
```python
{
    "id": "string (UUID)",
    "name": "string",
    "color": "string (hex color)",
    "projectId": "string (UUID)"
}
```

### ImageData
```python
{
    "id": "string (UUID)",
    "name": "string",
    "data": "string (base64 encoded image)",
    "width": "integer",
    "height": "integer",
    "projectId": "string (UUID)",
    "annotations": "array of Annotation (optional)"
}
```

### Annotation
```python
{
    "id": "string (UUID)",
    "imageId": "string (UUID)",
    "labelId": "string (UUID)",
    "coordinates": "object (annotation-specific)",
    "type": "string (box|polygon|free-draw)",
    "createdAt": "datetime",
    "updatedAt": "datetime"
}
```

## API Endpoints

### Projects

#### GET /projects
- **Description**: Fetch all projects
- **Response**: `Project[]`
- **Status Codes**: 200 OK, 401 Unauthorized, 500 Internal Server Error

#### POST /projects
- **Description**: Create a new project
- **Request Body**: `Project`
- **Response**: `Project`
- **Status Codes**: 201 Created, 400 Bad Request, 401 Unauthorized, 500 Internal Server Error

#### PUT /projects/{projectId}
- **Description**: Update a project
- **Path Parameters**: `projectId` (string)
- **Request Body**: `Partial<Project>`
- **Response**: `Project`
- **Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### DELETE /projects/{projectId}
- **Description**: Delete a project
- **Path Parameters**: `projectId` (string)
- **Status Codes**: 204 No Content, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

### Labels

#### GET /projects/{projectId}/labels
- **Description**: Fetch labels for a project
- **Path Parameters**: `projectId` (string)
- **Response**: `Label[]`
- **Status Codes**: 200 OK, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### POST /labels
- **Description**: Create a new label
- **Request Body**: `Label`
- **Response**: `Label`
- **Status Codes**: 201 Created, 400 Bad Request, 401 Unauthorized, 500 Internal Server Error

#### PUT /labels/{labelId}
- **Description**: Update a label
- **Path Parameters**: `labelId` (string)
- **Request Body**: `Partial<Label>`
- **Response**: `Label`
- **Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### DELETE /labels/{labelId}
- **Description**: Delete a label
- **Path Parameters**: `labelId` (string)
- **Status Codes**: 204 No Content, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

### Images

#### GET /projects/{projectId}/images
- **Description**: Fetch all images for a project
- **Path Parameters**: `projectId` (string)
- **Response**: `ImageData[]`
- **Status Codes**: 200 OK, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### GET /projects/{projectId}/images?offset={offset}&limit={limit}
- **Description**: Fetch paginated images for a project
- **Path Parameters**: `projectId` (string)
- **Query Parameters**: 
  - `offset` (integer): Starting index (0-based)
  - `limit` (integer): Maximum number of images to return
- **Response**: `ImageData[]`
- **Status Codes**: 200 OK, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### GET /images/{imageId}
- **Description**: Fetch a specific image
- **Path Parameters**: `imageId` (string)
- **Response**: `ImageData`
- **Status Codes**: 200 OK, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### POST /images
- **Description**: Create a new image
- **Request Body**: `ImageData`
- **Response**: `ImageData`
- **Status Codes**: 201 Created, 400 Bad Request, 401 Unauthorized, 500 Internal Server Error

#### PUT /images/{imageId}
- **Description**: Update an image
- **Path Parameters**: `imageId` (string)
- **Request Body**: `Partial<ImageData>`
- **Response**: `ImageData`
- **Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### DELETE /images/{imageId}
- **Description**: Delete an image
- **Path Parameters**: `imageId` (string)
- **Status Codes**: 204 No Content, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

### Annotations

#### GET /projects/{projectId}/annotations
- **Description**: Fetch all annotations for a project
- **Path Parameters**: `projectId` (string)
- **Response**: `Annotation[]`
- **Status Codes**: 200 OK, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### GET /images/{imageId}/annotations
- **Description**: Fetch annotations for a specific image
- **Path Parameters**: `imageId` (string)
- **Response**: `Annotation[]`
- **Status Codes**: 200 OK, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### POST /annotations
- **Description**: Create a new annotation
- **Request Body**: `Annotation`
- **Response**: `Annotation`
- **Status Codes**: 201 Created, 400 Bad Request, 401 Unauthorized, 500 Internal Server Error

#### PUT /annotations/{annotationId}
- **Description**: Update an annotation
- **Path Parameters**: `annotationId` (string)
- **Request Body**: `Partial<Annotation>`
- **Response**: `Annotation`
- **Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

#### DELETE /annotations/{annotationId}
- **Description**: Delete an annotation
- **Path Parameters**: `annotationId` (string)
- **Status Codes**: 204 No Content, 401 Unauthorized, 404 Not Found, 500 Internal Server Error

## Error Response Format

All error responses should follow this format:

```python
{
    "error": "string",
    "message": "string",
    "details": "object (optional)",
    "timestamp": "datetime"
}
```

## Authentication Endpoints

#### POST /login
- **Description**: User login
- **Request Body**: `{"username": "string", "password": "string"}`
- **Response**: `User` object with authentication token
- **Status Codes**: 200 OK, 401 Unauthorized, 500 Internal Server Error

#### POST /logout
- **Description**: User logout
- **Status Codes**: 200 OK, 401 Unauthorized, 500 Internal Server Error

## Additional Endpoints (Optional)

### Settings
- `GET /settings` - Fetch application settings
- `POST /settings` - Save or update settings

### Users
- `GET /users` - Fetch all users
- `POST /users` - Create a new user
- `PUT /users/{userId}` - Update a user
- `DELETE /users/{userId}` - Delete a user

### Tasks
- `GET /tasks` - Fetch all tasks
- `GET /tasks/project/{projectId}` - Fetch tasks for a project
- `POST /tasks` - Create a new task
- `PUT /tasks/{taskId}` - Update a task
- `DELETE /tasks/{taskId}` - Delete a task

### AI Models
- `GET /projects/{projectId}/ai-models` - Fetch AI models for a project
- `POST /ai-models` - Create a new AI model
- `PUT /ai-models/{aiModelId}` - Update an AI model
- `DELETE /ai-models/{aiModelId}` - Delete an AI model

### History
- `GET /projects/{projectId}/history` - Fetch history for a project
- `POST /history` - Create a new history entry
- `PUT /history/{historyId}` - Update a history entry
- `DELETE /history/{historyId}` - Delete a history entry

## Implementation Notes

1. **CORS**: Ensure CORS is properly configured to allow requests from the frontend
2. **File Upload**: For image uploads, consider using multipart/form-data instead of base64 encoding for better performance
3. **Pagination**: Implement proper pagination for large datasets
4. **Caching**: Consider implementing caching for frequently accessed data
5. **Validation**: Implement proper input validation and sanitization
6. **Error Handling**: Provide meaningful error messages for debugging
7. **Rate Limiting**: Consider implementing rate limiting for API endpoints
8. **Logging**: Implement comprehensive logging for monitoring and debugging

## Database Schema Recommendations

The Python backend should implement database tables that correspond to the data models above, with proper relationships and indexes for optimal performance.
