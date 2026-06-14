---
name: vailabel-studio
description: Architecture map and conventions for VaiLabel Studio (Tauri + React desktop image-annotation tool). Use when working anywhere in apps/studio — the canvas/labeling tools, annotation create/save/render flow, the React state/viewmodels, or the Rust backend (store.rs / lib.rs / domain). Orients you fast so you don't have to re-explore the codebase.
---

# VaiLabel Studio — codebase guide

VaiLabel Studio is a desktop image annotation / labeling tool (LabelMe / Label Studio style),
built with **Tauri (Rust) + React + TypeScript**. Monorepo; the desktop app is `apps/studio`
(there is also `apps/web`).

## Stack & commands

- **Frontend**: React + Vite + Tailwind v4 in `apps/studio/src`; UI on `@base-ui/react`.
- **Backend**: Rust + Tauri + Diesel(SQLite) in `apps/studio/src-tauri`.
- Scripts (`apps/studio/package.json`): `build` = `tsc --noEmit && vite build`, `typecheck`,
  `test` = `jest`, `lint` = eslint, `tauri` / `tauri:build`.
- **Env quirks (Windows)**: the Bash tool runs *bash*, not PowerShell. Local bins are at
  `apps/studio/node_modules/.bin/*.cmd` — `npx tsc` misresolves, so call `tsc.cmd` / `jest.cmd`
  directly. Backend: `cargo check` from `apps/studio/src-tauri`.

## Annotation / labeling tools — end-to-end flow

Tools: `box`, `polygon`, `point`, `line`, `linestrip`, `circle`, `freeDraw`, plus `move`/`delete`.

1. **Provider**: `src/pages/studio/page.tsx` wraps `<ImageLabeler>` in `CanvasProvider`.
2. **UI shell**: `src/components/studio/image-labeler.tsx` → `Toolbar` + `MemoizedCanvas`.
3. **Canvas**: `src/components/canvas/canvas.tsx`; annotations rendered by
   `annotation-renderer.tsx` → per-type `*-annotation.tsx`; live drawing previews in
   `components/canvas/temp-annotations/`.
4. **Tools**: `src/tools/handlers/*-handler.ts` (onMouseDown/Move/Up). Dispatched by
   `src/hooks/use-canvas-handlers-context.tsx` (`createToolHandler`). A box drag creates a temp
   annotation → sets `showLabelInput` → `create-annotation.tsx` modal → `onCreateAnnotationDraft`.
5. **Canvas state**: `src/contexts/canvas-context.tsx` — zoom/pan/tool/selection/toolState.
   High-frequency **cursor position lives in a separate `CursorProvider`** (writer-only
   `useSetCanvasCursor()` returns a stable setter) so mouse-move only re-renders the crosshair /
   coordinate overlays, not every annotation.
6. **Viewmodels**: `src/features/studio/use-studio-screen-viewmodel.ts` composes
   `src/viewmodels/image-labeler-viewmodel.ts` (data + reload) and
   `src/features/studio/use-canvas-session.ts` (undo/redo; wraps create/update/delete — this is
   what the Canvas actually calls).
7. **Services → IPC**: `src/services/*-service.ts` → `src/ipc/studio.ts` (`studioCommands`, e.g.
   `annotations_save`, `annotations_list_by_image`) → `src/ipc/invoke.ts`.
8. **Backend**: `src-tauri/src/lib.rs` Tauri commands → `src/store.rs`.

**Coordinates**: stored in **image space**. `getCanvasCoords` (`src/tools/canvas-utils.ts`) maps
client→image; annotations render inside a div transformed by `translate(baseOffset) scale(zoom)`.

## Backend persistence (Rust)

- `store.rs` `DesktopStore` = one `SqliteConnection`. `open()` creates tables idempotently with
  `CREATE TABLE IF NOT EXISTS` (Diesel embedded migrations were removed — do **not** drop tables
  on startup; that wipes user data). Generic `EntityStore`: `upsert_entity` / `list_entities` /
  `list_by_field` dispatch by `kind`.
- `lib.rs` `save_entity`: update-by-id (`merge_patch`) else create; `normalize_entity` injects
  id/createdAt/updatedAt and mirrors camel/snake aliases (e.g. `imageId`↔`image_id`) + ensures
  `coordinates`. It returns the **normalized payload, not a re-read DB row**. Command payload
  structs use `#[serde(rename_all = "camelCase")]`.
- **Domain events**: `emit_domain_event` → `app.emit("studio://domain-event", {entity, action, id,
  projectId, imageId})`. Frontend `src/ipc/events.ts` `listenToStudioEvents` filters by entity and
  **only fires on desktop** (`isDesktopApp()`). Viewmodels subscribe and call `loadData()` to
  refetch after a save.

### ⚠️ Non-obvious gotcha
**Annotations have no `domain/` module.** `annotations`, `predictions`, `history`, and `settings`
go through the generic JSON `EntityStore` in `store.rs` (+ `lib.rs` commands). Only
`projects`, `tasks`, `labels`, `images`, and `ai` have typed Diesel modules under `src/domain/`.

## Conventions / preferences

- **Keep the UI fast and motion-free.** Decorative animation (animate-in / fade-in / slide-in /
  zoom-in / transition-all / hover scales) is suppressed app-wide by a global kill-switch at the end
  of `src/index.css`; functional loading feedback (`.animate-spin`, `.animate-pulse`,
  `.animate-caret-blink`) is preserved. Don't add decorative motion by default.
- **Avoid putting high-frequency state in shared context** — split it (see `CursorProvider`) so a
  rapid update doesn't re-render the whole canvas tree.
- Match surrounding code style; prefer `tsc --noEmit` + `jest` before declaring done.
