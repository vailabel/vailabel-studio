---
name: vailabel-studio
description: Architecture map and conventions for VaiLabel Studio (Tauri + React desktop image-annotation tool). Use when working anywhere in apps/studio — the canvas/labeling tools, annotation create/save/render flow, the React state/viewmodels, or the Rust backend (lib.rs composition root / the per-module crates). Orients you fast so you don't have to re-explore the codebase.
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
8. **Backend**: organized by vertical feature slice. `src-tauri/src/features/<slice>/commands.rs`
   holds the `#[tauri::command]` handlers (thin dispatchers) next to that slice's adapters
   (`service.rs`, port impls); they call the owning module's app-service / typed Diesel repo (in
   `src-tauri/crates/<module>/`). `src/lib.rs` = composition root (`AppState`/`run()`/`generate_handler!`);
   `src/shared/` = cross-cutting kernel (entity JSON helpers, domain-event emit, keychain).

**Coordinates**: stored in **image space**. `getCanvasCoords` (`src/tools/canvas-utils.ts`) maps
client→image; annotations render inside a div transformed by `translate(baseOffset) scale(zoom)`.

## Backend persistence (Rust)

- **DDD modular monolith** (see `crates/ARCHITECTURE.md`). Each domain is a crate under
  `src-tauri/crates/` with `domain/application/contracts` (pure) + an `infrastructure/` layer
  holding the module's own `diesel::table!` + typed repository over the shared `vailabel-db`
  connection. The embedded `migrations/` are the single source of truth for the schema and run at
  startup — there is **no** runtime `CREATE TABLE`, and no monolithic `DesktopStore`/`EntityStore`
  anymore (both removed). Persistence-owning modules: `project`, `dataset` (images), `annotation`
  (`LabelClass` + `Annotation` + `Prediction`), `models` (`AiModel` + `RuntimeModel`), `workspace`
  (settings + history + secret-keys), `training`, `analysis`, `video`.
- The binary (`src/`) is the composition root: it builds each repo, wires the app services, and
  exposes Tauri commands. The few command handlers / adapters that still shape `serde_json::Value`
  (`AiService`, the dataset import/export commands, the runtime-model glue, the copilot ports) hold
  the typed repos they need and persist directly; `AiService` uses a private per-kind `RepoStore`
  shim (`src/features/ai/service.rs`) for that.
- `lib.rs` `normalize_entity` injects id/createdAt/updatedAt and mirrors camel/snake aliases (e.g.
  `imageId`↔`image_id`) + ensures `coordinates`, then the JSON is deserialized into the module's
  aggregate and saved via its repo (`save_atomic`). Aggregates serialize back with dual-key
  `to_value()` (camel + snake), so the wire format is unchanged. Command payload structs use
  `#[serde(rename_all = "camelCase")]`.
- **Domain events**: `emit_domain_event` → `app.emit("studio://domain-event", {entity, action, id,
  projectId, imageId})` (also reachable via the `EventBus` + `TauriEventSubscriber` in
  `src/composition.rs`). Frontend `src/ipc/events.ts` `listenToStudioEvents` filters by entity and
  **only fires on desktop** (`isDesktopApp()`). Viewmodels subscribe and call `loadData()` to
  refetch after a save.

## Conventions / preferences

- **Keep the UI fast and motion-free.** Decorative animation (animate-in / fade-in / slide-in /
  zoom-in / transition-all / hover scales) is suppressed app-wide by a global kill-switch at the end
  of `src/index.css`; functional loading feedback (`.animate-spin`, `.animate-pulse`,
  `.animate-caret-blink`) is preserved. Don't add decorative motion by default.
- **Avoid putting high-frequency state in shared context** — split it (see `CursorProvider`) so a
  rapid update doesn't re-render the whole canvas tree.
- Match surrounding code style; prefer `tsc --noEmit` + `jest` before declaring done.
