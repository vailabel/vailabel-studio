# Database Seeding Guide

This document explains how to seed the VAI Label Studio API database with initial data.

## Quick Start

The easiest way to seed the database is to use the development script:

```bash
./scripts/dev.sh
```

This script will:

1. Create/activate virtual environment
2. Install dependencies
3. Run database migrations
4. **Automatically seed the database**
5. Start the development server

## Manual Seeding

If you need to run seeding manually:

### 1. Comprehensive Seeding (Recommended)

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all seeding operations
python scripts/seed_all.py
```

This script will:

- Create all default permissions (27 permissions)
- Create all default roles (admin, manager, annotator, viewer)
- Create admin user with admin role
- Prepare for sample data (future expansion)

### 2. Individual Seeding Scripts

You can also run individual seeding scripts:

```bash
# Seed permissions and roles only
python scripts/seed_permissions.py

# Create admin user only
python scripts/seed_admin_user.py

# Legacy admin user creation (simpler)
python scripts/seed_admin.py
```

## Default Data

### Admin User

- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: `admin` (full access)

### Roles

#### Admin

- Full system access
- All 27 permissions

#### Manager

- Project and user management
- 18 permissions including:
  - All project operations
  - User management
  - Label and annotation management
  - Task management
  - AI model management
  - Settings management

#### Annotator

- Annotation and labeling tasks
- 8 permissions including:
  - Project read access
  - Label and annotation management
  - Task management
  - AI model read access

#### Viewer

- Read-only access
- 6 permissions including:
  - Project read access
  - Label and annotation read access
  - Task read access
  - AI model read access
  - Settings read access

### Permissions

The system includes 27 permissions covering:

- **Projects**: read, write, delete
- **Users**: read, write, delete
- **Labels**: read, write, delete
- **Annotations**: read, write, delete
- **Tasks**: read, write, delete
- **AI Models**: read, write, delete
- **Settings**: read, write, delete
- **Permissions**: read, write, delete
- **Roles**: read, write, delete

## Database Schema

The seeding process creates the following tables:

- `users` - User accounts
- `permissions` - Individual permissions
- `roles` - Role definitions
- `role_permissions` - Role-permission associations
- `user_permissions` - Direct user-permission assignments

## Troubleshooting

### Permission Denied

```bash
chmod +x scripts/seed_all.py
chmod +x scripts/dev.sh
```

### Database Connection Issues

Make sure the database is properly configured in your environment variables.

### Migration Issues

```bash
# Run migrations first
alembic upgrade head

# Then run seeding
python scripts/seed_all.py
```

### Duplicate Data

The seeding scripts are idempotent - they can be run multiple times safely. Existing data will be skipped.

## Development Workflow

1. **First time setup**:

   ```bash
   ./scripts/dev.sh
   ```

2. **Reset database** (if needed):

   ```bash
   # Delete database file
   rm db.sqlite3

   # Run migrations and seeding
   alembic upgrade head
   python scripts/seed_all.py
   ```

3. **Add new permissions/roles**:
   - Update `DEFAULT_PERMISSIONS` and `DEFAULT_ROLES` in `scripts/seed_all.py`
   - Run the seeding script again

## Production Considerations

⚠️ **Important**: The default admin password (`admin123`) is for development only. In production:

1. Change the admin password immediately
2. Use proper password hashing
3. Consider using environment variables for sensitive data
4. Review and customize permissions as needed

## API Endpoints

After seeding, you can test the API:

```bash
# Login as admin
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'

# Get current user info (with permissions)
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

After successful seeding:

1. Start the API server: `uvicorn main:app --reload`
2. Test the frontend application
3. Create additional users as needed
4. Customize permissions and roles for your use case
