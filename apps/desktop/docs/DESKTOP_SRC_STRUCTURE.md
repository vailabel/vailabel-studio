# Desktop App: Architecture Overview & `src/` Structure Guide

## Architecture Overview

The Desktop app is built using Electron, combining a Node.js-powered main process with a Chromium-based renderer process. It integrates tightly with the Core library for shared logic and the API backend for data operations. Key architectural features include:

- **Main Process:** Manages application lifecycle, windows, IPC, and system-level operations.
- **Renderer Process:** Handles UI rendering, user interactions, and communicates with the main process via secure IPC channels.
- **Preload Scripts:** Bridge secure APIs from main to renderer, enforcing security boundaries.
- **IPC Handlers:** Enable robust communication between UI and backend logic.
- **AI Modules:** Provide local AI-powered features, leveraging models and services for annotation and automation.
- **Database Layer:** Manages local storage, caching, and synchronization with remote APIs.
- **Integration Points:** Core and API modules are imported for shared services, data models, and business logic.

This modular architecture ensures maintainability, scalability, and security for desktop features.

---

# Desktop App: `src/` Structure Guide

This guide documents the structure and main modules of the `apps/desktop/src/` directory. It is designed to help developers understand how the desktop app is organized and how it integrates with the Core and API modules.

---

## 1. Main Modules

### `main.ts`
- **Purpose:** Entry point for the Electron main process.
- **Responsibilities:**
  - Initializes the application window(s).
  - Sets up IPC communication.
  - Loads preload scripts and configures app lifecycle events.
  - Integrates with core services and API endpoints.

### `preload.ts`
- **Purpose:** Preload script for Electron renderer processes.
- **Responsibilities:**
  - Exposes secure APIs to the renderer via `contextBridge`.
  - Bridges communication between renderer and main process.
  - Restricts direct Node.js access for security.

---

## 2. IPC Handlers (`ipc/`)
- **Location:** `src/ipc/`
- **Purpose:** Contains modules for handling inter-process communication (IPC) between renderer and main processes.
- **Typical Files:**
  - `ipc/handlers.ts` — Registers IPC event handlers.
  - `ipc/channels.ts` — Defines IPC channel names and types.
- **Usage:**
  - Used to send/receive messages, trigger actions, and share data between UI and backend logic.

---

## 3. AI Modules (`ai/`)
- **Location:** `src/ai/`
- **Purpose:** Implements AI-powered features and integrations.
- **Typical Files:**
  - `ai/model.ts` — Loads and manages AI models.
  - `ai/service.ts` — Provides AI inference and utility functions.
- **Usage:**
  - Used for tasks such as annotation, prediction, or automation within the desktop app.
  - May interact with core services for shared logic.

---

## 4. Database Setup (`db/`)
- **Location:** `src/db/`
- **Purpose:** Manages local database connections and operations.
- **Typical Files:**
  - `db/index.ts` — Initializes database and exports connection utilities.
  - `db/schema.ts` — Defines database schema and migrations.
  - `db/queries.ts` — Contains reusable query functions.
- **Usage:**
  - Used for storing user data, app state, and caching results locally.
  - May sync with remote API or core data models.

---

## 5. Integration with Core and API
- **Core Integration:**
  - Imports shared logic, types, and services from `apps/core/`.
  - Example: `import { SomeService } from '@vailabel/core';`
- **API Integration:**
  - Communicates with backend API via HTTP or IPC.
  - Example: Fetching data, sending updates, or triggering workflows.

---

## 6. Additional Noteworthy Directories
- `src/assets/` — Static files (images, icons, etc.) used by the app.
- `src/docs/` — Developer documentation and guides.
- `src/userData/` — Stores user-specific data and settings.
- `src/utils/` — Utility functions and helpers for common tasks.
- `src/components/` — (If present) Shared UI components for renderer processes.

---

## 7. Best Practices
- Keep modules focused and well-documented.
- Use TypeScript for type safety and maintainability.
- Organize code by feature and responsibility.
- Document public APIs and integration points.
- Add tests for critical logic and IPC handlers.

