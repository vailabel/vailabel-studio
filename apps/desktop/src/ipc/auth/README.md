# Desktop Authentication API

This directory contains the Electron IPC handlers for authentication in the desktop application.

## Overview

The authentication system provides secure user management for the desktop app using:
- **Local SQLite database** for user storage
- **bcrypt** for password hashing
- **JWT-like tokens** for session management
- **Role-based access control** (RBAC)

## IPC Handlers

### Authentication
- `login:users` - User login with email/password
- `register:users` - User registration
- `logout:users` - User logout
- `validateToken:auth` - Token validation
- `getCurrentUser:auth` - Get current user info
- `updateProfile:auth` - Update user profile
- `changePassword:auth` - Change user password

## Default Admin User

On first run, the system creates a default admin user:
- **Email**: `admin@vailabel.com`
- **Password**: `admin123`
- **Role**: `admin`

## User Roles & Permissions

### Admin
- Full access to all features
- User management
- System settings
- All CRUD operations

### Manager
- Project management
- User viewing
- Label management
- AI model management

### Reviewer
- Project viewing
- Annotation review/editing
- AI model viewing

### Annotator
- Project viewing
- Annotation creation/editing

## Token Format

Local tokens use the format: `local_{userId}_{timestamp}`

Example: `local_admin-1_1703123456789`

## Security Features

- Passwords are hashed using bcrypt with salt rounds = 10
- Tokens expire after 24 hours
- No plain text password storage
- Secure token validation

## Usage

The authentication handlers are automatically registered when the desktop app starts. The studio app uses these handlers through the `LocalAuthService` which communicates via Electron IPC.

## Testing

Run the test function to verify all handlers work correctly:

```typescript
import { testAuthHandlers } from "./test"
await testAuthHandlers()
```
