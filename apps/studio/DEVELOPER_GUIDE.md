# Studio App Developer Guide

This guide provides an overview of the Studio app structure and guidance for developers contributing to it.

## 1. Project Structure

Key directories in `src/`:

- `components/` – Reusable UI components and feature-specific components (canvas, forms, modals, auth, overview, tables, settings, etc.).
- `hooks/` – Custom React hooks for canvas interactions, state management, pagination, performance optimization, and UI behavior.
- `contexts/` – React context providers for auth, canvas, and storage.
- `services/` – Service implementations for API calls, storage, auth, and business logic.
- `lib/` – Utilities and helper functions.
- `ipc/` – IPC hooks for communication between Electron main and renderer processes.
- `tools/` – Annotation and canvas tools with strategies and handlers.
- `pages/` – Application pages.
- `types/` – TypeScript global types.
- `viewmodels/` – State management for pages and components.
- `utils/` – Utility functions.

## 2. Key Components

Organized under `src/components/`:

- **UI:** `components/ui/` – buttons, dialogs, cards, tables, tooltips, etc.
- **Canvas:** `components/canvas/` – annotation renderer, canvas provider, tools.
- **Auth:** `components/auth/` – authentication UI and status.
- **Forms:** `components/forms/` – configuration forms for AI models and cloud services.
- **Modals:** `components/modals/` – dialogs for adding/editing labels or projects.
- **Settings:** `components/settings/` – general/advanced settings panels, keyboard shortcuts.
- **Overview:** `components/overview/` – overview page components.
- **Tables:** `components/tables/` – table components for images, labels, or other entities.

**Tip:** Use `main-layout.tsx` as the wrapper for all page layouts.

## 3. Hooks

Key hooks in `src/hooks/`:

- `use-canvas-handlers-context.tsx` – manages annotation tool events.
- `use-confirm-dialog.tsx` – prompts confirmation dialogs.
- `use-mobile.tsx` – detects mobile layouts.
- `use-paginated-images.ts` – handles paginated image loading.
- `use-performance-optimization.ts` – optimizes rendering performance.
- `use-stoage.tsx` – storage state management.
- `use-toast.ts` – toast notifications.

**Tip:** Prefix hooks with `use-` and follow React rules of hooks.

## 4. Modifying Components or Adding New Ones

### Modifying Existing Components

1. Locate the component in `src/components/`.
2. Update its props interface if necessary.
3. Adjust styles or hooks if required.
4. Test the component in `pages/studio/page.tsx` or the relevant parent.

### Adding a New Component

1. Create a `.tsx` file in the appropriate subfolder under `components/`.
2. Export the component.
3. Import and use it in the parent component.
4. Add tests in the `__tests__/` folder if applicable.
5. Reuse existing hooks or create new custom hooks as needed.

**Example:**

```ts
// src/components/ui/MyButton.tsx
import React from 'react'

type MyButtonProps = {
  label: string
  onClick: () => void
}

export const MyButton: React.FC<MyButtonProps> = ({ label, onClick }) => (
  <button onClick={onClick}>{label}</button>
)
```

**Tip:** Follow existing component patterns and styles for consistency.

## 5. Developer Guidelines

- Follow naming conventions for files, components, and hooks.
- Keep components small, reusable, and focused.
- Ensure proper TypeScript typings.
- Use context and hooks for shared state.
- Write tests for new features or modifications.
- Document new hooks, components, or services in this guide.

