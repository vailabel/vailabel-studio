# Core Developer Guide

This guide provides an overview of the `core` app, its interaction with other components, key modules, and instructions for extending or modifying services.

---

## 1. Overview: How Core Interacts with Other Apps

The `core` app serves as the foundational library for the Vailabel Studio ecosystem. It provides shared utilities, business logic, and service abstractions that are consumed by:

- **Desktop App** (`apps/desktop/`): Uses core for shared logic, state management, and service interfaces.
- **Studio App** (`apps/studio/`): Imports core modules for UI logic, data handling, and common utilities.
- **API App** (`apps/api/`): May use core for validation, data models, and service contracts.

Core acts as the central point for code reuse and consistency across all apps.

---

## 2. Key Modules

### `src/index.ts`
- **Purpose:** Entry point for the core library. Exports main services, types, and utilities.
- **Usage:** Other apps import from `core` via this file, e.g.:
  ```ts
  import { SomeService } from '@vailabel/core';
  ```
- **Structure:**
  - Exports service classes, utility functions, and type definitions.
  - May aggregate exports from submodules for convenience.

### `src/index.test.ts`
- **Purpose:** Contains unit tests for the core entry point and its exports.
- **Usage:** Run with the project's test runner (e.g., Jest) to validate core functionality.
- **Structure:**
  - Tests service instantiation, utility functions, and type contracts.

---

## 3. Extending or Modifying Services

### Adding a New Service
1. **Create the Service:**
   - Add a new file in `src/services/`, e.g., `src/services/newService.ts`.
   - Implement your service class or function.
2. **Export the Service:**
   - Update `src/index.ts` to export your new service:
     ```ts
     export { NewService } from './services/newService';
     ```
3. **Document the Service:**
   - Add JSDoc comments to your service for clarity.
   - Optionally, update this guide with usage instructions.

### Modifying an Existing Service
1. **Locate the Service:**
   - Find the relevant file in `src/services/`.
2. **Make Changes:**
   - Refactor or extend the service as needed.
   - Ensure backward compatibility if the service is widely used.
3. **Update Exports:**
   - If you change the service's API, update `src/index.ts` and dependent apps.
4. **Test Your Changes:**
   - Add or update tests in `src/index.test.ts` or a dedicated test file.

### Best Practices
- Use TypeScript for type safety and maintainability.
- Write unit tests for all new and modified services.
- Document public APIs and service contracts.
- Keep core logic generic and reusable.

---

## 4. Example: Adding a Utility Function

1. **Create the Utility:**
   - `src/utils/myUtility.ts`:
     ```ts
     /**
      * Adds two numbers together.
      */
     export function add(a: number, b: number): number {
       return a + b;
     }
     ```
2. **Export the Utility:**
   - In `src/index.ts`:
     ```ts
     export { add } from './utils/myUtility';
     ```
3. **Test the Utility:**
   - In `src/index.test.ts`:
     ```ts
     import { add } from './index';
     test('add utility', () => {
       expect(add(2, 3)).toBe(5);
     });
     ```

---

## 5. References & Further Reading
- [README.md](./README.md)
- [PYTHON_API_CONTRACT.md](../docs/PYTHON_API_CONTRACT.md)
- [Studio Developer Guide](../../studio/DEVELOPER_GUIDE.md)