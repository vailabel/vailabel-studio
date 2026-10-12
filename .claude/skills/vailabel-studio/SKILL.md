---
name: vailabel-studio
description: Architecture map and conventions for VaiLabel Studio (Tauri + React desktop image-annotation tool). Use when working anywhere in apps/studio — the canvas/labeling tools, annotation create/save/render flow, the React state/viewmodels, or the Rust backend (lib.rs composition root / the per-module crates). Orients you fast so you don't have to re-explore the codebase.
---

# VaiLabel Studio — codebase guide

VaiLabel Studio is a desktop image annotation / labeling tool (LabelMe / Label Studio style),
built with **Tauri (Rust) + React + TypeScript**. Monorepo; the desktop app is `apps/studio`
(there is also `apps/web`).

## Stack & commands

- **Frontend**: React 19 + Vite + Tailwind v4 in `apps/studio/src`; UI on `@base-ui/react`
  (shadcn primitives vendored in `src/shared/ui`).
- **Backend**: Rust + Tauri + Diesel(SQLite) in `apps/studio/src-tauri`.
- Scripts (`apps/studio/package.json`): `build` = `tsc -b && vite build`, `typecheck` = `tsc -b`,
  `test` = `vitest run --coverage`, `lint` = eslint, `tauri` / `tauri:build`.
- Local bins: `apps/studio/node_modules/.bin/{tsc,vitest,eslint,vite}` (on Windows use the
  `.cmd` variants — `npx tsc` misresolves). Backend: `cargo check` from `apps/studio/src-tauri`.

## Frontend architecture (lint-enforced)

`app ─▶ features/<name> ─▶ shared` — dependencies only point right. Full rules and how-tos:
`apps/studio/docs/DEVELOPER_FEATURE_GUIDE.md`.

- `src/app` composes: `route-table.ts` (spreads each feature's routes; every page is lazy),
  `routes.tsx`, `navigation.ts`, `layout/`.
- `src/features/<name>/{index.ts, routes/, components/, model/}` — `index.ts` exports only the
  feature's `FeatureRoute[]`. Features never import each other.
- `src/shared/{ui, components, hooks, services, ipc, lib, model, types}`.
- Only `shared/ipc` + `shared/lib/desktop.ts` import `@tauri-apps/*`; only `shared/services`
  issues commands. Feature code uses `services.*`, `useAppEvent` / `useStudioEvents`.
- Data loading goes through `useResource` (`shared/hooks/use-resource.ts`): loading/error state,
  stale-response protection, debounced reload on domain events. URLs come from `paths` in
  `shared/lib/routes.ts`. Errors → text via `toErrorMessage`.

## Labeling types (config-driven)

Every project stores a labeling config (`settings.labelConfig`; objects + controls). `inferModalityTask`
(`shared/lib/label-config/infer.ts`) routes it to a native editor (image canvas / text / audio / video /
table) or to the config-driven editor (`features/studio/components/editors/custom`), which renders from
registries: object viewers (`custom/object-viewers.tsx` — image, text, audio, video, hypertext, timeseries,
pdf) and whole-item controls (`shared/components/label-config/controls/control-registry.ts`). Supported tags
are listed in `shared/lib/label-config/support.ts`; template availability is derived from
`isConfigSupported`, never hand-flagged. Results are stored as `annotation.meta` kind `"result"`.
Sample data for every template: Projects → Samples (`features/projects/model/seed`).

## Annotation / labeling tools — end-to-end flow

Tools: `box`, `polygon`, `point`, `line`, `linestrip`, `circle`, `freeDraw`, plus `move`/`delete`.
All paths below are under `src/features/studio/`.

1. **Provider**: `routes/studio-page.tsx` wraps the labeling screen in `CanvasProvider`.
2. **UI shell**: `components/labeling-screen.tsx` → editor from `components/editors/editor-registry.ts`
   (image: `editors/image-editor.tsx` → `toolbar.tsx` / `tool-rail.tsx` + `editors/image/memoized-canvas.tsx`).
3. **Canvas**: `components/canvas/canvas.tsx`; annotations rendered by
   `annotation-renderer.tsx` → per-type `*-annotation.tsx`; live drawing previews in
   `components/canvas/temp-annotations/`.
4. **Tools**: `canvas-state/tools/handlers/*-handler.ts` (onMouseDown/Move/Up), registered in
   `canvas-state/tools/tool-registry.ts` and dispatched by
   `canvas-state/use-canvas-handlers-context.tsx`. A box drag creates a temp
   annotation → sets `showLabelInput` → `create-annotation.tsx` modal → `onCreateAnnotationDraft`.
5. **Canvas state**: `canvas-state/canvas-context.tsx` — zoom/tool/display toggles, with pan,
   selection, tool-state and **cursor position in their own providers** (writer-only
   `useSetCanvasCursor()` returns a stable setter) so mouse-move only re-renders the crosshair /
   coordinate overlays, not every annotation.
6. **Viewmodels**: `model/use-studio-screen-viewmodel.ts` composes
   `model/image-labeler-viewmodel.ts` (data + reload) and `model/use-canvas-session.ts`
   (undo/redo; wraps create/update/delete — this is what the Canvas actually calls).
7. **Services → IPC**: `src/shared/services/*-service.ts` → `src/shared/ipc/studio.ts`
   (`studioCommands`, e.g. `annotations_save`, `annotations_list_by_image`) → `src/shared/ipc/invoke.ts`.
8. **Backend**: organized by vertical feature slice. `src-tauri/src/features/<slice>/commands.rs`
   holds the `#[tauri::command]` handlers (thin dispatchers) next to that slice's adapters
   (`service.rs`, port impls); they call the owning module's app-service / typed Diesel repo (in
   `src-tauri/crates/<module>/`). `src/lib.rs` = composition root (`AppState`/`run()`/`generate_handler!`);
   `src/shared/` = cross-cutting kernel (entity JSON helpers, domain-event emit, keychain).

**Coordinates**: stored in **image space**. `getCanvasCoords` (`canvas-state/tools/canvas-utils.ts`)
maps client→image; annotations render inside a div transformed by `translate(baseOffset) scale(zoom)`.

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
  `src/composition.rs`). Frontend `src/shared/ipc/events.ts` `listenToStudioEvents` filters by
  entity and **only fires on desktop** (`isDesktopApp()`). View models react through
  `useResource({ invalidateOn: [...] })` or `useStudioEvents`.

## Conventions / preferences

- **Keep the UI fast and motion-free.** Decorative animation (animate-in / fade-in / slide-in /
  zoom-in / transition-all / hover scales) is suppressed app-wide by a global kill-switch at the end
  of `src/index.css`; functional loading feedback (`.animate-spin`, `.animate-pulse`,
  `.animate-caret-blink`) is preserved. Don't add decorative motion by default.
- **Avoid putting high-frequency state in shared context** — split it (see `CursorProvider`) so a
  rapid update doesn't re-render the whole canvas tree.
- Match surrounding code style; run `tsc -b`, `eslint .` and `vitest run` before declaring done.
