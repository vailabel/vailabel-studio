📚 Web App Architecture & Developer Guide :-



📝 Placement Structure:
markdown
# 🏗️ Web App Architecture & Developer Guide

> **Professional guide for Vailabel Studio's clean architecture pattern**  
> *Learn how to build, extend, and maintain scalable web applications*

---

## 🎯 Before You Start

### Prerequisites
- Basic knowledge of React and TypeScript
- Understanding of clean architecture principles
- Familiarity with dependency injection

### Recommended Reading
- [React Hooks Documentation](https://react.dev/reference/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com)

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Adapters Layer](#adapters-layer)
4. [Services Layer](#services-layer)
5. [ViewModels Layer](#viewmodels-layer)
6. [Extension Guide](#extension-guide)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)
9. [Testing Guidelines](#testing-guidelines)
10. [Performance Considerations](#performance-considerations)
11. [Debugging Tips](#debugging-tips)
12. [Common Pitfalls](#common-pitfalls)
13. [Quick Start Example](#quick-start-example)

---

## 🔄 Version Compatibility

This guide is compatible with:
- React 18+
- TypeScript 4.5+
- Node.js 16+
- Modern browsers (ES2020+)

---

## 🤝 Contributing to Architecture

When extending the architecture:
1. **Follow existing patterns** - Maintain consistency
2. **Update this documentation** - Keep it current
3. **Add tests** - Ensure reliability
4. **Use TypeScript strictly** - Maintain type safety
5. **Consider backward compatibility** - Avoid breaking changes

---

THEN CONTINUE WITH YOUR EXISTING CONTENT STARTING FROM:
## 🎯 Overview
The Vailabel Studio web application follows a clean architecture pattern...


🎯 Overview
The Vailabel Studio web application follows a clean architecture pattern with clear separation of concerns between data access, business logic, and presentation layers. This guide explains the purpose and usage of each architectural layer.

Architecture Diagram

┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Components & Pages                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    ViewModels                           │ │
│  │  • State management                                    │ │
│  │  • UI logic coordination                               │ │
│  │  • User interaction handling                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Business Services                      │ │
│  │  • Business logic                                      │ │
│  │  • Use case orchestration                              │ │
│  │  • Cross-cutting concerns                              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Adapters Layer                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Data Adapters                          │ │
│  │  • API communication                                   │ │
│  │  • Data transformation                                 │ │
│  │  • Error handling                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Storage Adapters                         │ │
│  │  • Persistent storage                                  │ │
│  │  • File operations                                     │ │
│  │  • Cache management                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
🏗️ Architecture Principles

1. Separation of Concerns
Adapters: Handle external communication and data persistence

Services: Contain business logic and use case orchestration

ViewModels: Manage UI state and user interactions

Components: Handle presentation and rendering

2. Dependency Inversion
All layers depend on abstractions (interfaces) rather than concrete implementations.

3. Single Responsibility
Each class has one clear purpose and reason to change.

4. Testability
All layers are easily testable through dependency injection and interface segregation.

🔌 Adapters Layer
Purpose
Adapters act as the bridge between the application and external systems (APIs, storage, third-party services). They handle data transformation, error handling, and protocol-specific logic.

Location

apps/web/src/adapters/
├── data/           # API and data source adapters
├── storage/        # Storage and persistence adapters
└── interfaces/     # Adapter contracts and types
Data Adapters
FastApiDataAdapter
Purpose: Communicates with the FastAPI backend for all CRUD operations.


// Example usage
const dataAdapter = new FastApiDataAdapter();
const projects = await dataAdapter.getProjects();
const newProject = await dataAdapter.createProject(projectData);
Key Methods:

getProjects(), createProject(), updateProject(), deleteProject()

getImages(), uploadImage(), deleteImage()

getLabels(), createLabel(), updateLabel()

getAnnotations(), createAnnotation(), updateAnnotation()

Error Handling:


try {
  const result = await dataAdapter.getProjects();
  return result;
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API-specific errors
    showToast(error.message);
  }
  throw error;
}
Storage Adapters

Interface Contract

export interface IStorageAdapter {
  saveImage(id: string, data: string | Buffer): Promise<void>;
  loadImage(id: string): Promise<string | Buffer>;
  deleteImage(id: string): Promise<void>;
  listImages(): Promise<string[]>;
}
Available Implementations
Base64StorageAdapter

Stores images as base64 strings in localStorage

Ideal for small datasets and development

FileSystemStorageAdapter

Uses Electron's file system API for desktop app

Suitable for large image datasets

S3StorageAdapter

AWS S3 integration for cloud storage

Uses Cognito for authentication

AzureBlobStorageAdapter

Azure Blob Storage integration

Enterprise-grade storage solution

HybridAdapter

Combines multiple storage backends

Fallback mechanism for reliability

Usage Examples

// Using Base64 storage
const storage = new Base64StorageAdapter();
await storage.saveImage('img1', base64Data);
const image = await storage.loadImage('img1');

// Using Hybrid storage (local + cloud)
const localStorage = new Base64StorageAdapter();
const cloudStorage = new S3StorageAdapter(bucket, region, identityPoolId);
const hybridStorage = new HybridAdapter(localStorage, cloudStorage);

// Hybrid adapter will try local first, then fallback to cloud
const image = await hybridStorage.loadImage('img1');
🛠️ Services Layer
Purpose
Services contain the core business logic, orchestrate use cases, and handle cross-cutting concerns like authentication, validation, and error handling.

Location

apps/web/src/services/
├── auth/           # Authentication services
├── data/           # Data management services
├── storage/        # Storage management services
├── ai/             # AI model services
└── index.ts        # Service exports
Core Services
AuthService
Purpose: Handles user authentication, token management, and session handling.


class AuthService {
  async login(email: string, password: string): Promise<User>;
  async logout(): Promise<void>;
  async refreshToken(): Promise<string>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
}
ProjectService
Purpose: Manages project-related business logic and operations.


class ProjectService {
  async createProject(data: CreateProjectDto): Promise<Project>;
  async updateProject(id: string, data: UpdateProjectDto): Promise<Project>;
  async deleteProject(id: string): Promise<void>;
  async importProject(file: File): Promise<Project>;
  async exportProject(id: string): Promise<Blob>;
}
ImageService
Purpose: Handles image operations including upload, processing, and management.


class ImageService {
  async uploadImages(files: File[], projectId: string): Promise<Image[]>;
  async processImage(imageId: string, operations: ImageOperation[]): Promise<Image>;
  async getImageThumbnail(imageId: string, size: ThumbnailSize): Promise<string>;
  async batchDeleteImages(imageIds: string[]): Promise<void>;
}
AnnotationService
Purpose: Manages annotation creation, validation, and AI-assisted labeling.


class AnnotationService {
  async createAnnotation(data: CreateAnnotationDto): Promise<Annotation>;
  async updateAnnotation(id: string, data: UpdateAnnotationDto): Promise<Annotation>;
  async autoAnnotate(imageId: string, modelId: string): Promise<Annotation[]>;
  async validateAnnotation(annotation: Annotation): Promise<ValidationResult>;
}
Service Composition
Services can compose other services to handle complex use cases:


class ProjectImportService {
  constructor(
    private projectService: ProjectService,
    private imageService: ImageService,
    private annotationService: AnnotationService
  ) {}

  async importFromVOC(file: File): Promise<Project> {
    // 1. Parse VOC XML
    // 2. Create project using ProjectService
    // 3. Upload images using ImageService
    // 4. Create annotations using AnnotationService
  }
}
🎮 ViewModels Layer
Purpose
ViewModels bridge the gap between services and UI components. They manage UI state, handle user interactions, and provide reactive data to components.

Location

apps/web/src/viewmodels/
├── pages/          # Page-level viewmodels
├── components/     # Component-specific viewmodels
└── shared/         # Reusable viewmodels
Key ViewModels
useProjectViewModel
Purpose: Manages project-related UI state and operations.


export function useProjectViewModel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: CreateProjectDto) => {
    try {
      const newProject = await projectService.createProject(data);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      setError('Failed to create project');
      throw err;
    }
  }, []);

  return {
    projects,
    loading,
    error,
    loadProjects,
    createProject,
    // ... other methods
  };
}
useImageLabelerViewModel
Purpose: Manages the image labeling interface state.


export function useImageLabelerViewModel(projectId: string) {
  const [currentImage, setCurrentImage] = useState<Image | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolType>('rectangle');

  const loadImageData = useCallback(async (imageId: string) => {
    const [image, imageAnnotations] = await Promise.all([
      imageService.getImage(imageId),
      annotationService.getImageAnnotations(imageId)
    ]);
    setCurrentImage(image);
    setAnnotations(imageAnnotations);
  }, []);

  const createAnnotation = useCallback(async (data: CreateAnnotationDto) => {
    const annotation = await annotationService.createAnnotation(data);
    setAnnotations(prev => [...prev, annotation]);
    return annotation;
  }, []);

  return {
    currentImage,
    annotations,
    selectedTool,
    loadImageData,
    createAnnotation,
    setSelectedTool,
    // ... other methods
  };
}
ViewModel Patterns
1. State Management Pattern

function useViewModel() {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Operations that update state
  const operations = useMemo(() => ({
    async fetch() { /* ... */ },
    async create(item: T) { /* ... */ },
    async update(id: string, changes: Partial<T>) { /* ... */ },
    async remove(id: string) { /* ... */ }
  }), []);

  return { data, loading, error, ...operations };
}
2. Form Handling Pattern

function useFormViewModel<T>() {
  const [formData, setFormData] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  }, [errors]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      await validationService.validate(formData);
      await service.create(formData as T);
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(error.details);
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [formData]);

  return { formData, errors, submitting, updateField, submit };
}
🔧 Extension Guide
Creating a New Data Adapter
Step 1: Define the Interface

// apps/web/src/adapters/interfaces/ICustomDataAdapter.ts
export interface ICustomDataAdapter {
  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item>;
  createItem(data: CreateItemDto): Promise<Item>;
  updateItem(id: string, data: UpdateItemDto): Promise<Item>;
  deleteItem(id: string): Promise<void>;
}

export interface CreateItemDto {
  name: string;
  description?: string;
}

export interface UpdateItemDto {
  name?: string;
  description?: string;
}
Step 2: Implement the Adapter

// apps/web/src/adapters/data/CustomDataAdapter.ts
import { ICustomDataAdapter, CreateItemDto, UpdateItemDto } from '../interfaces/ICustomDataAdapter';

export class CustomDataAdapter implements ICustomDataAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async getItems(): Promise<Item[]> {
    const response = await fetch(`${this.baseUrl}/items`);
    if (!response.ok) {
      throw new ApiError('Failed to fetch items', response.status);
    }
    return response.json();
  }

  async getItem(id: string): Promise<Item> {
    const response = await fetch(`${this.baseUrl}/items/${id}`);
    if (!response.ok) {
      throw new ApiError('Item not found', response.status);
    }
    return response.json();
  }

  async createItem(data: CreateItemDto): Promise<Item> {
    const response = await fetch(`${this.baseUrl}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new ApiError('Failed to create item', response.status);
    }
    return response.json();
  }

  // ... other methods
}
Step 3: Export the Adapter

// apps/web/src/adapters/data/index.ts
export { CustomDataAdapter } from './CustomDataAdapter';
Creating a New Storage Adapter

Step 1: Implement IStorageAdapter

// apps/web/src/adapters/storage/CustomStorageAdapter.ts
import { IStorageAdapter } from '../interfaces/IStorageAdapter';

export class CustomStorageAdapter implements IStorageAdapter {
  async saveImage(id: string, data: string | Buffer): Promise<void> {
    // Implementation details
  }

  async loadImage(id: string): Promise<string | Buffer> {
    // Implementation details
  }

  async deleteImage(id: string): Promise<void> {
    // Implementation details
  }

  async listImages(): Promise<string[]> {
    // Implementation details
  }
}
Creating a New Service
Step 1: Define Service Interface (Optional)

// apps/web/src/services/interfaces/ICustomService.ts
export interface ICustomService {
  performOperation(data: OperationData): Promise<OperationResult>;
  validateInput(data: any): ValidationResult;
}
Step 2: Implement the Service

// apps/web/src/services/CustomService.ts
import { ICustomService } from './interfaces/ICustomService';
import { CustomDataAdapter } from '../../adapters/data/CustomDataAdapter';

export class CustomService implements ICustomService {
  constructor(private dataAdapter: CustomDataAdapter) {}

  async performOperation(data: OperationData): Promise<OperationResult> {
    // 1. Validate input
    const validation = this.validateInput(data);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // 2. Perform business logic
    const processedData = this.processData(data);

    // 3. Use adapter for data persistence
    const result = await this.dataAdapter.createItem(processedData);

    // 4. Additional business logic
    return this.enrichResult(result);
  }

  validateInput(data: any): ValidationResult {
    // Validation logic
    return { isValid: true, errors: [] };
  }

  private processData(data: OperationData): ProcessedData {
    // Data processing logic
    return { ...data, processedAt: new Date() };
  }

  private enrichResult(result: any): OperationResult {
    // Result enrichment logic
    return { ...result, metadata: { enriched: true } };
  }
}
Step 3: Export the Service

// apps/web/src/services/index.ts
export { CustomService } from './CustomService';
Creating a New ViewModel
Step 1: Define the ViewModel Hook

// apps/web/src/viewmodels/useCustomViewModel.ts
import { useState, useCallback } from 'react';
import { CustomService } from '../services/CustomService';

export function useCustomViewModel(service: CustomService) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await service.getItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [service]);

  const createItem = useCallback(async (data: CreateItemDto) => {
    try {
      const newItem = await service.createItem(data);
      setItems(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
      throw err;
    }
  }, [service]);

  return {
    items,
    loading,
    error,
    loadItems,
    createItem,
  };
}
✅ Best Practices
1. Adapter Best Practices
Error Handling

class RobustDataAdapter {
  async getData(): Promise<Data> {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        // Network error
        throw new NetworkError('Unable to connect to server');
      }
      throw error;
    }
  }
}
Retry Logic

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  throw lastError!;
}
2. Service Best Practices
Validation

class ValidatedService {
  private validateCreateData(data: CreateDto): ValidationResult {
    const errors: string[] = [];
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (data.name && data.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
Transaction Pattern

class TransactionalService {
  async performTransactionalOperation(steps: OperationStep[]): Promise<void> {
    const rollbackSteps: (() => Promise<void>)[] = [];
    
    try {
      for (const step of steps) {
        await step.execute();
        rollbackSteps.unshift(step.rollback);
      }
    } catch (error) {
      // Rollback completed steps
      for (const rollback of rollbackSteps) {
        try {
          await rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      throw error;
    }
  }
}
3. ViewModel Best Practices
State Management

function useOptimizedViewModel() {
  // Use useReducer for complex state
  const [state, dispatch] = useReducer(viewModelReducer, initialState);
  
  // Memoize operations to prevent unnecessary re-renders
  const operations = useMemo(() => ({
    load: () => dispatch({ type: 'LOAD_START' }),
    create: (item: Item) => dispatch({ type: 'CREATE_ITEM', payload: item }),
    // ... other operations
  }), []);
  
  return { ...state, ...operations };
}
Effect Management

function useViewModelWithEffects(dependencies: any[]) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      try {
        const result = await fetchData();
        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        if (!cancelled) {
          // Handle error
        }
      }
    };
    
    loadData();
    
    return () => {
      cancelled = true;
    };
  }, dependencies);
  
  return data;
}
🔄 Common Patterns
1. Adapter Factory Pattern

class AdapterFactory {
  static createStorageAdapter(type: StorageType): IStorageAdapter {
    switch (type) {
      case StorageType.LOCAL:
        return new Base64StorageAdapter();
      case StorageType.FILE_SYSTEM:
        return new FileSystemStorageAdapter();
      case StorageType.S3:
        return new S3StorageAdapter();
      case StorageType.HYBRID:
        return new HybridAdapter(
          new Base64StorageAdapter(),
          new S3StorageAdapter()
        );
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }
}
2. Service Locator Pattern

class ServiceLocator {
  private static instances = new Map<string, any>();
  
  static register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }
  
  static get<T>(key: string): T {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(`Service not found: ${key}`);
    }
    return instance;
  }
}

// Usage
ServiceLocator.register('authService', new AuthService());
const authService = ServiceLocator.get<AuthService>('authService');
3. Repository Pattern

class GenericRepository<T> {
  constructor(private adapter: IDataAdapter<T>) {}
  
  async findAll(): Promise<T[]> {
    return this.adapter.getAll();
  }
  
  async findById(id: string): Promise<T | null> {
    return this.adapter.getById(id);
  }
  
  async create(data: Omit<T, 'id'>): Promise<T> {
    return this.adapter.create(data);
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.adapter.update(id, data);
  }
  
  async delete(id: string): Promise<void> {
    return this.adapter.delete(id);
  }
}
🧪 Testing Guidelines
Testing Adapters

describe('FastApiDataAdapter', () => {
  let adapter: FastApiDataAdapter;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    adapter = new FastApiDataAdapter();
  });

  it('should fetch projects successfully', async () => {
    const mockProjects = [{ id: '1', name: 'Test Project' }];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProjects),
    });

    const result = await adapter.getProjects();
    expect(result).toEqual(mockProjects);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/projects');
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(adapter.getProjects()).rejects.toThrow('Project not found');
  });
});
Testing Services

describe('ProjectService', () => {
  let service: ProjectService;
  let mockAdapter: jest.Mocked<IDataAdapter>;

  beforeEach(() => {
    mockAdapter = {
      getProjects: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
    };
    service = new ProjectService(mockAdapter);
  });

  it('should create project with validation', async () => {
    const projectData = { name: 'Test Project', description: 'Test' };
    mockAdapter.createProject.mockResolvedValue({ ...projectData, id: '1' });

    const result = await service.createProject(projectData);
    expect(result).toHaveProperty('id');
    expect(mockAdapter.createProject).toHaveBeenCalledWith(projectData);
  });
});
Testing ViewModels

describe('useProjectViewModel', () => {
  const MockProjectService = {
    getProjects: jest.fn(),
    createProject: jest.fn(),
  };

  it('should load projects successfully', async () => {
    const mockProjects = [{ id: '1', name: 'Test Project' }];
    MockProjectService.getProjects.mockResolvedValue(mockProjects);

    const { result } = renderHook(() => 
      useProjectViewModel(MockProjectService as any)
    );

    await act(async () => {
      await result.current.loadProjects();
    });

    expect(result.current.projects).toEqual(mockProjects);
    expect(result.current.loading).toBe(false);
  });
});
🚀 Performance Considerations
1. Adapter Performance
Implement caching where appropriate

Use request batching for multiple operations

Consider lazy loading for large datasets

2. Service Performance
Use memoization for expensive calculations

Implement background processing for long-running operations

Consider streaming for large data transfers

3. ViewModel Performance
Use React.memo for expensive components

Implement virtual scrolling for large lists

Use useCallback and useMemo to prevent unnecessary re-renders

🔍 Debugging Tips
1. Adapter Debugging

class DebuggableAdapter implements IStorageAdapter {
  async saveImage(id: string, data: string | Buffer): Promise<void> {
    console.log(`Saving image ${id}, size: ${data.length}`);
    try {
      // ... implementation
      console.log(`Successfully saved image ${id}`);
    } catch (error) {
      console.error(`Failed to save image ${id}:`, error);
      throw error;
    }
  }
}
2. Service Debugging
Use structured logging

Implement request/response interception

Add performance monitoring

3. ViewModel Debugging
Use React DevTools

Implement state change logging

Add error boundary components



## 🎯 Next Steps

1. **Explore the codebase** to see these patterns in action
2. **Check the tests** for implementation examples  
3. **Review existing components** to understand real-world usage

