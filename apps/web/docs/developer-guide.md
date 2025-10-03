# Developer Guide for Web Adapters and Services

This guide explains the structure, purpose, and usage of **adapters** and **services** in the Vision AI Label Studio web app (`apps/web`).

> **Note:** Save this file as `DEVELOPER_GUIDE.md` in your project root.

---

## 📋 Table of Contents

- [Developer Guide for Web Adapters and Services](#developer-guide-for-web-adapters-and-services)
  - [📋 Table of Contents](#-table-of-contents)
  - [📁 Adapters](#-adapters)
    - [Adapter Location](#adapter-location)
    - [Adapter Purpose](#adapter-purpose)
    - [Example: Using a Data Adapter](#example-using-a-data-adapter)
    - [Creating a New Adapter](#creating-a-new-adapter)
  - [📁 Services](#-services)
    - [Service Location](#service-location)
    - [Service Purpose](#service-purpose)
    - [Example: Using a Service](#example-using-a-service)
    - [Creating a New Service](#creating-a-new-service)
  - [🏗 Best Practices](#-best-practices)
  - [📝 Additional Notes](#-additional-notes)
    - [ViewModels](#viewmodels)
    - [Storage Layer](#storage-layer)
    - [Documentation](#documentation)
  - [⚡ Quick Reference](#-quick-reference)

---

## 📁 Adapters

Adapters are responsible for interacting with different types of data sources. They provide a clean API to fetch, update, and store data.

### Adapter Location

- **Data Adapters**: `apps/web/src/adapters/data/` → Handles application data (projects, labels, etc.)  
- **Storage Adapters**: `apps/web/src/adapters/storage/` → Handles local storage or other persistent storage mechanisms

### Adapter Purpose

Adapters serve three key functions:

- **Encapsulate data access logic** – Keep all data operations centralized  
- **Maintain independence** – Services and components remain decoupled from storage implementation  
- **Enable flexibility** – Easily swap storage methods or external APIs

### Example: Using a Data Adapter

```javascript
import { ProjectAdapter } from '../adapters/data/ProjectAdapter';

async function loadProjects() {
  const projects = await ProjectAdapter.getAllProjects();
  console.log(projects);
}

loadProjects();
```

### Creating a New Adapter

Steps to create a new adapter:

- Create a new file in `data/` or `storage/` folder  
- Export a class or object with standard CRUD methods  

**Example: TaskAdapter**

```javascript
export const TaskAdapter = {
  async getAllTasks() {
    // Fetch all tasks from your storage or API
  },

  async getTaskById(id) {
    // Fetch a single task by ID
  },

  async createTask(task) {
    // Save a new task
  },

  async updateTask(task) {
    // Update an existing task
  },

  async deleteTask(id) {
    // Remove task by ID
  },
};
```

---

## 📁 Services

Services handle business logic and interact with adapters. They are used by components or viewmodels to perform complex operations.

### Service Location

- **Core Services**: `apps/web/src/services/` → Business logic  
- **ViewModels**: `apps/web/src/viewmodels/` → Connect services with React components

### Service Purpose

Services provide:

- **Complex operations** – Multi-step business logic  
- **Data aggregation** – Combine data from multiple adapters  
- **Clean interfaces** – Simple API for components

### Example: Using a Service

```javascript
import { ProjectService } from '../services/ProjectService';

async function showActiveProjects() {
  const activeProjects = await ProjectService.getActiveProjects();
  console.log(activeProjects);
}

showActiveProjects();
```

### Creating a New Service

Steps to create a new service:

- Import required adapters  
- Create methods for your feature operations  
- Export the service object or class  

**Example: TaskService**

```javascript
import { TaskAdapter } from '../adapters/data/TaskAdapter';

export const TaskService = {
  async getIncompleteTasks() {
    const tasks = await TaskAdapter.getAllTasks();
    return tasks.filter(task => !task.completed);
  },

  async addTask(taskData) {
    const task = {
      ...taskData,
      createdAt: new Date(),
      completed: false,
    };
    return await TaskAdapter.createTask(task);
  },

  async completeTask(taskId) {
    const task = await TaskAdapter.getTaskById(taskId);
    if (task) {
      task.completed = true;
      task.completedAt = new Date();
      return await TaskAdapter.updateTask(task);
    }
  },
};
```

---

## 🏗 Best Practices

- **Keep adapters focused** – Only handle data access  
- **Keep services focused** – Only handle business logic  
- **Use the right layer** – Components should use services, not adapters directly  
- **Return promises** – All async operations must return promises  
- **Consistent naming** – Adapter suffix for data/storage, Service suffix for logic

**Directory structure for reference:**

```bash
apps/web/src/
├── adapters/
│   ├── data/          # Data adapters (ProjectAdapter, LabelAdapter)
│   └── storage/       # Storage adapters
├── services/          # Business logic (ProjectService, TaskService)
└── viewmodels/        # React component connectors
```

---

## 📝 Additional Notes

### ViewModels

ViewModels (`apps/web/src/viewmodels/`) are optional layers connecting services to React components. Use them for:

- Complex state management  
- Computed properties  
- Reusable component logic

### Storage Layer

Adapters can use any storage mechanism (localStorage, API, or custom DB). Keep the interface consistent for services.

### Documentation

- Add JSDoc comments to all public methods  
- Include usage examples in code comments  
- Update this guide with new patterns or conventions

---

## ⚡ Quick Reference

| Layer     | Purpose        | Example                          |
|-----------|----------------|----------------------------------|
| Adapter   | Data access    | `ProjectAdapter.getAllProjects()` |
| Service   | Business logic | `ProjectService.getActiveProjects()` |
| ViewModel | Component state| `useProjectViewModel()`          |

---

**Tip:** Check existing adapters and services in the repo for real-world examples.
