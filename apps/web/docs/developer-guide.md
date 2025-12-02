
# Developer Guide: Web Adapters and Services

A comprehensive guide for understanding and working with adapters and services in the Vision AI Label Studio web application (`apps/web`).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Adapters](#adapters)
- [Services](#services)
- [ViewModels](#viewmodels)
- [Best Practices](#best-practices)
- [Quick Reference](#quick-reference)

---

## Overview

The web application follows a layered architecture pattern that separates data access, business logic, and UI concerns:

```
Components (React UI)
       ↓
ViewModels (State Management - Optional)
       ↓
Services (Business Logic)
       ↓
Adapters (Data Access)
       ↓
Storage (IndexedDB/API)
```

### Why This Architecture?

- **Separation of Concerns**: Each layer has a single, well-defined responsibility
- **Testability**: Easy to unit test each layer independently
- **Maintainability**: Changes in one layer don't ripple through others
- **Flexibility**: Easy to swap implementations (e.g., switch from IndexedDB to REST API)

---

## Architecture

### Project Structure

```
apps/web/src/
├── adapters/
│   ├── data/              # Application data adapters
│   │   ├── CloudApiDataAdapter.ts
│   │   ├── ElectronApiDataAdaptor.ts
│   │   └── IDataAdapter.ts
│   └── storage/           # Storage implementation adapters
│       ├── adapters/
│       │   ├── azure/
│       │   ├── base64/
│       │   ├── filesystem/
│       │   ├── hybrid/
│       │   └── s3/
│       └── interfaces/
│           └── IStorageAdapter.ts
├── services/              # Business logic services
│   ├── contracts/         # Service interfaces
│   │   ├── IAIModelService.ts
│   │   ├── IAnnotationService.ts
│   │   ├── IAuthService.ts
│   │   ├── IImageDataService.ts
│   │   ├── ILabelService.ts
│   │   ├── IProjectService.ts
│   │   ├── ISettingsService.ts
│   │   ├── ITaskService.ts
│   │   └── IUserService.ts
│   └── implementations/   # Service implementations
│       ├── AIModelService.ts
│       ├── AnnotationService.ts
│       ├── AuthService.ts
│       ├── ImageDataService.ts
│       ├── LabelService.ts
│       ├── ProjectService.ts
│       ├── SettingsService.ts
│       ├── TaskService.ts
│       └── UserService.ts
├── viewmodels/            # React state management
│   ├── ai-model-viewmodel.ts
│   ├── cloud-storage-viewmodel.ts
│   ├── overview-viewmodel.ts
│   ├── project-create-viewmodel.ts
│   ├── project-detail-viewmodel.ts
│   ├── project-list-viewmodel.ts
│   ├── settings-viewmodel.ts
│   └── task-page-viewmodel.ts
└── components/            # React UI components
    └── ...
```

### Data Flow

1. **User Interaction** → Component receives user action
2. **Component** → Calls ViewModel or Service method
3. **ViewModel/Service** → Processes request, applies business logic
4. **Service** → Calls appropriate Adapter(s) for data access
5. **Adapter** → Interacts with storage layer (IndexedDB, API, etc.)
6. **Data** → Flows back up through the layers to the UI

---

## Adapters

Adapters provide a clean, consistent interface for data access operations. They abstract away storage implementation details.

### 📁 Location

| Type | Path | Purpose |
|------|------|---------|
| **Data Adapters** | `apps/web/src/adapters/data/` | Handle application data access (projects, labels, tasks) |
| **Storage Adapters** | `apps/web/src/adapters/storage/` | Handle different storage mechanisms (Azure, S3, Base64, FileSystem) |

### 🎯 Responsibilities

**Adapters SHOULD:**
- ✅ Perform CRUD operations (Create, Read, Update, Delete)
- ✅ Transform data between storage and application formats
- ✅ Handle storage-specific queries and operations
- ✅ Implement consistent error handling

**Adapters SHOULD NOT:**
- ❌ Contain business logic or validation
- ❌ Make decisions about data processing
- ❌ Call other adapters or services
- ❌ Manage application state

### 📝 Adapter Interfaces

#### Data Adapter Interface

```typescript
// apps/web/src/adapters/data/IDataAdapter.ts
export interface IDataAdapter {
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(project: Project): Promise<Project>;
  updateProject(project: Project): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Similar patterns for other entities...
}
```

#### Storage Adapter Interface

```typescript
// apps/web/src/adapters/storage/interfaces/IStorageAdapter.ts
export interface IStorageAdapter {
  uploadFile(file: File, path: string): Promise<string>;
  downloadFile(path: string): Promise<Blob>;
  deleteFile(path: string): Promise<void>;
  listFiles(prefix?: string): Promise<string[]>;
}
```

### 💡 Example Usage

```typescript
import { CloudApiDataAdapter } from '@/adapters/data/CloudApiDataAdapter';

// In a service
async function loadProjects() {
  try {
    const projects = await CloudApiDataAdapter.getAllProjects();
    return projects;
  } catch (error) {
    console.error('Failed to load projects:', error);
    throw error;
  }
}
```

### 🔧 Creating a New Adapter

When creating a new adapter, follow these steps:

1. **Define the interface** (if needed)
2. **Implement the adapter class**
3. **Handle errors appropriately**
4. **Add JSDoc comments**

**Example:**

```typescript
// apps/web/src/adapters/data/CustomAdapter.ts

/**
 * Custom Data Adapter for specific data source
 */
export class CustomAdapter implements IDataAdapter {
  /**
   * Get all items from the data source
   * @returns {Promise<Item[]>} Array of items
   * @throws {Error} If the operation fails
   */
  async getAll(): Promise<Item[]> {
    try {
      // Implementation
      return items;
    } catch (error) {
      console.error('CustomAdapter.getAll failed:', error);
      throw error;
    }
  }

  // Implement other interface methods...
}
```

---

## Services

Services contain business logic and orchestrate operations across multiple adapters. They provide a clean API for components and viewmodels.

### 📁 Location

```
apps/web/src/services/
├── contracts/         # Service interfaces
└── implementations/   # Service implementations
```

### 🎯 Responsibilities

**Services SHOULD:**
- ✅ Implement business logic and validation rules
- ✅ Coordinate operations across multiple adapters
- ✅ Transform and aggregate data
- ✅ Handle complex workflows
- ✅ Provide clear error messages

**Services SHOULD NOT:**
- ❌ Access storage directly (use adapters)
- ❌ Contain UI logic or state management
- ❌ Know about React components

### 📝 Service Pattern

#### Service Interface

```typescript
// apps/web/src/services/contracts/IProjectService.ts

export interface IProjectService {
  getAllProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project>;
  createProject(data: CreateProjectDTO): Promise<Project>;
  updateProject(id: string, data: UpdateProjectDTO): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  getActiveProjects(): Promise<Project[]>;
}
```

#### Service Implementation

```typescript
// apps/web/src/services/implementations/ProjectService.ts

import { IProjectService } from '../contracts/IProjectService';
import { CloudApiDataAdapter } from '@/adapters/data/CloudApiDataAdapter';

export class ProjectService implements IProjectService {
  async getActiveProjects(): Promise<Project[]> {
    // Business logic: filter only active projects
    const projects = await CloudApiDataAdapter.getAllProjects();
    return projects.filter(p => p.status === 'active');
  }

  async createProject(data: CreateProjectDTO): Promise<Project> {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Project name is required');
    }

    // Business logic: add default values
    const project: Project = {
      ...data,
      id: generateId(),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save via adapter
    return await CloudApiDataAdapter.createProject(project);
  }

  // Other methods...
}
```

### 💡 Example Usage

```typescript
import { ProjectService } from '@/services/implementations/ProjectService';

// In a component or viewmodel
async function loadActiveProjects() {
  try {
    const service = new ProjectService();
    const projects = await service.getActiveProjects();
    return projects;
  } catch (error) {
    console.error('Failed to load active projects:', error);
    throw error;
  }
}
```

---

## ViewModels

ViewModels are optional React hooks that manage component state and connect services to the UI. They follow the MVVM (Model-View-ViewModel) pattern.

### 📁 Location

```
apps/web/src/viewmodels/
```

### 🎯 Purpose

ViewModels provide:
- **State Management**: Encapsulate component state logic
- **Computed Properties**: Derive values from state
- **Action Handlers**: Handle user interactions
- **Reusability**: Share logic across multiple components

### 💡 Example ViewModel

```typescript
// apps/web/src/viewmodels/project-list-viewmodel.ts

import { useState, useEffect, useCallback } from 'react';
import { ProjectService } from '@/services/implementations/ProjectService';

export function useProjectListViewModel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = new ProjectService();

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.getActiveProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: CreateProjectDTO) => {
    try {
      await service.createProject(data);
      await loadProjects(); // Refresh list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      return false;
    }
  }, [loadProjects]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await service.deleteProject(id);
      await loadProjects(); // Refresh list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      return false;
    }
  }, [loadProjects]);

  // Computed properties
  const projectCount = projects.length;
  const hasProjects = projectCount > 0;

  return {
    // State
    projects,
    loading,
    error,
    
    // Computed properties
    projectCount,
    hasProjects,
    
    // Actions
    loadProjects,
    createProject,
    deleteProject,
  };
}
```

### 🔧 Using ViewModels in Components

```typescript
// In a React component
import { useProjectListViewModel } from '@/viewmodels/project-list-viewmodel';

function ProjectListPage() {
  const {
    projects,
    loading,
    error,
    projectCount,
    createProject,
    deleteProject,
  } = useProjectListViewModel();

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <h2>Projects ({projectCount})</h2>
      <ProjectList 
        projects={projects}
        onDelete={deleteProject}
      />
      <CreateProjectButton onCreate={createProject} />
    </div>
  );
}
```

---

## Best Practices

### 🏗️ Architecture Guidelines

| ✅ Do | ❌ Don't |
|-------|----------|
| Keep each layer focused on its responsibility | Mix concerns across layers |
| Use adapters for all data access | Access storage directly from services |
| Put business logic in services | Put business logic in adapters |
| Use viewmodels for complex state | Put all logic in components |
| Use TypeScript interfaces for contracts | Use any type |
| Handle errors at every layer | Let errors propagate silently |

### 📝 Naming Conventions

```typescript
// Adapters
CloudApiDataAdapter
ElectronApiDataAdaptor
AzureBlobStorageAdapter
S3StorageAdapter

// Service Interfaces
IProjectService
ITaskService
IAnnotationService

// Service Implementations
ProjectService
TaskService
AnnotationService

// ViewModels
useProjectListViewModel
useTaskPageViewModel
useSettingsViewModel
```

### 🔒 Error Handling

**Layer-by-layer approach:**

```typescript
// Adapter - Pass errors up
async getById(id: string) {
  try {
    return await api.get(`/items/${id}`);
  } catch (error) {
    console.error('Adapter error:', error);
    throw error; // Re-throw for service to handle
  }
}

// Service - Add context and validation
async getItem(id: string) {
  if (!id) {
    throw new Error('Item ID is required');
  }
  
  try {
    const item = await adapter.getById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  } catch (error) {
    console.error('Service error:', error);
    throw new Error(`Failed to get item: ${error.message}`);
  }
}

// ViewModel - Handle for UI
const loadItem = useCallback(async (id: string) => {
  setLoading(true);
  setError(null);
  try {
    const item = await service.getItem(id);
    setItem(item);
  } catch (error) {
    setError(error.message); // User-friendly error
  } finally {
    setLoading(false);
  }
}, []);
```

### 📚 Documentation Standards

Always include JSDoc comments for public methods:

```typescript
/**
 * Get all active projects
 * @returns {Promise<Project[]>} Array of active project objects
 * @throws {Error} If the database query fails
 */
async getActiveProjects(): Promise<Project[]> {
  // Implementation
}
```

### 🧪 Testing Strategy

- **Adapters**: Mock storage/API, test CRUD operations
- **Services**: Mock adapters, test business logic
- **ViewModels**: Mock services, test state management

---

## Quick Reference

### Layer Responsibilities

| Layer | Purpose | Example |
|-------|---------|---------|
| **Component** | UI rendering & user interaction | `<ProjectList />` |
| **ViewModel** | State management & UI logic | `useProjectListViewModel()` |
| **Service** | Business logic & orchestration | `ProjectService.getActiveProjects()` |
| **Adapter** | Data access & storage operations | `CloudApiDataAdapter.getAllProjects()` |
| **Storage** | Persistence layer | IndexedDB, REST API, Cloud Storage |

### Common Patterns

#### Simple Data Fetch
```
Component → Service → Adapter → Storage
```

#### Complex Operation with State
```
Component → ViewModel → Service → Multiple Adapters → Storage
```

#### Data Aggregation
```
Service → [Adapter A, Adapter B, Adapter C] → Storage
```

### File Organization

```
apps/web/src/
├── adapters/              # Data access layer
│   ├── data/              # Application data adapters
│   └── storage/           # Storage implementation adapters
├── services/              # Business logic layer
│   ├── contracts/         # Service interfaces (contracts)
│   └── implementations/   # Service implementations
├── viewmodels/            # State management layer
└── components/            # Presentation layer
```

---

## Additional Notes

### Technology Stack

- **Storage**: IndexedDB (via Dexie.js in desktop app)
- **API**: REST API (for web app)
- **State Management**: React Hooks + ViewModels
- **Type Safety**: TypeScript interfaces for all layers

### When to Use Each Layer

- **Direct Service Usage**: For simple components with minimal state
- **ViewModels**: For complex components with shared logic or multiple state pieces
- **Multiple Adapters**: When data comes from different sources (local + cloud)

### Dependency Injection

The app uses a ServiceContainer pattern for dependency injection:

```typescript
// apps/web/src/services/ServiceContainer.ts
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  resolve<T>(key: string): T {
    return this.services.get(key);
  }
}
```

---

## Contributing

When adding new features:

1. **Define interfaces first** in `contracts/`
2. **Implement adapters** for data access
3. **Create services** for business logic
4. **Build viewmodels** for complex state
5. **Update this guide** with new patterns

For questions or suggestions, please open an issue or discussion on GitHub.

