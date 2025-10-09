# Studio Developer Feature Guide

This guide provides instructions for developers to add new features, pages, or components to the Studio app. It also covers best practices for modifying existing functionality and following the established folder structure.

---

## 1. Adding New Pages

- **Location:** Add new pages in `src/pages/`.
- **Steps:**
  1. Create a new file or folder for your page in `src/pages/`.
  2. Implement your page as a React component (e.g., `MyPage.tsx`).
  3. Export your page and add routing if necessary (see `src/App.tsx` or the router config).
  4. Use shared components from `src/components/` and hooks from `src/hooks/` as needed.

---

## 2. Adding New Components

- **Location:** Add reusable UI components in `src/components/`.
- **Steps:**
  1. Create a new file or folder in `src/components/` (e.g., `Button.tsx`).
  2. Write your component using React and TypeScript.
  3. Add JSDoc comments and prop types for clarity.
  4. Export your component for use in pages or other components.

---

## 3. Adding New Hooks

- **Location:** Add custom hooks in `src/hooks/`.
- **Steps:**
  1. Create a new file in `src/hooks/` (e.g., `useMyFeature.ts`).
  2. Implement your hook using standard React patterns.
  3. Document the hook's usage and expected return values.
  4. Export your hook for use in components and pages.

---

## 4. Modifying Existing Functionality

- **Find the Relevant File:** Locate the page, component, or hook you want to modify in `src/pages/`, `src/components/`, or `src/hooks/`.
- **Make Changes:** Refactor, extend, or update the code as needed. Ensure you follow TypeScript and React best practices.
- **Test Your Changes:** Add or update tests if available. Validate your changes in the development environment.
- **Document Updates:** Update JSDoc comments and usage instructions if the API or behavior changes.

---

## 5. Folder Structure Best Practices

- `src/` — Main source code directory.
  - `src/pages/` — Application pages and route components.
  - `src/components/` — Reusable UI components.
  - `src/hooks/` — Custom React hooks.
  - `src/utils/` — Utility functions (if applicable).
  - `src/styles/` — CSS or styling files.
- Keep code modular and reusable.
- Use clear and descriptive names for files and folders.
- Document public APIs and component props.

---

## 6. Example: Adding a New Button Component

1. **Create the Component:**
   - `src/components/MyButton.tsx`:
     ```tsx
     import React from 'react';
     type MyButtonProps = { label: string; onClick: () => void };
     export const MyButton: React.FC<MyButtonProps> = ({ label, onClick }) => (
       <button onClick={onClick}>{label}</button>
     );
     ```
2. **Use the Component:**
   - In a page or another component:
     ```tsx
     import { MyButton } from '../components/MyButton';
     // ...
     <MyButton label="Click Me" onClick={handleClick} />
     ```

---

## 7. References
- [Studio README.md](../README.md)
- [Performance Optimization Guide](../PERFORMANCE_OPTIMIZATION.md)
- [Core Developer Guide](../../core/DEVELOPER_GUIDE.md)

---
