# Studio Developer Feature Guide

How the Studio frontend (`apps/studio/src`) is organised, and how to add to it
without breaking the rules that keep it fast and predictable. The rules below
are enforced by `yarn lint` — if you break one, ESLint tells you which.

## The three layers

```
app  ──▶  features/<name>  ──▶  shared
```

Dependencies only point right.

| Layer | What lives there | May import |
| --- | --- | --- |
| `src/app` | Composition only: providers, router, layout chrome, navigation. | A feature's `index.ts`, `shared` |
| `src/features/<name>` | One product area (projects, studio, labels, …). | Its own files, `shared` |
| `src/shared` | Code two or more features need. | `shared` only |

- **Features never import each other.** If two features need the same thing,
  move it to `shared/`.
- **Only `shared/ipc` and `shared/lib/desktop.ts` touch Tauri.** Feature code
  calls `@/shared/services` (commands) and `@/shared/hooks/use-app-event`
  (events), so it works unchanged in the web build and in tests.

### Inside a feature

```
features/<name>/
  index.ts        public API — the feature's routes, nothing else
  routes/         one file per page, default export
  components/     UI used only by this feature
  model/          view-model hooks + pure logic (and their tests)
```

### Inside `shared`

| Folder | Contents |
| --- | --- |
| `ui/` | shadcn primitives (vendored — regenerate, don't hand-edit) |
| `components/` | Reusable composed components |
| `hooks/` | Reusable hooks (`use-resource`, `use-app-event`, …) |
| `services/` | Backend API, one object per domain. The only callers of IPC. |
| `ipc/` | Tauri transport: commands, events, updater |
| `lib/` | Pure helpers (`routes`, `errors`, `utils`, label-config, …) |
| `model/` | View models used by more than one feature |
| `types/` | Domain types |

## Conventions

- **File names are kebab-case.** Hooks start with `use-`.
- **Imports use the `@/` alias**, not `../../`.
- **Routes come from `@/shared/lib/routes`.** Use `paths.projectDetail(id)`;
  never write a URL string by hand.
- **Load data with `useResource`.** It owns loading / error state, drops stale
  responses, and reloads when the backend emits a domain event:

  ```ts
  const loadLabels = useCallback(() => loadLabelLibrary(projectId), [projectId])
  const { data, isLoading, error, reload, mutate } = useResource(loadLabels, {
    initialData: EMPTY_LIBRARY,
    invalidateOn: ["labels", "annotations"],
  })
  ```

  Don't hand-roll `useState` + `useEffect` + `listenToStudioEvents`.
- **Subscribe to backend events with `useAppEvent` / `useStudioEvents`.** They
  handle cleanup (including unmount-before-subscribed) for you.
- **Turn caught errors into text with `toErrorMessage`** (`@/shared/lib/errors`).
- **Keep the UI motion-free** and keep high-frequency state (cursor, pan) out
  of shared context — see the canvas providers for the pattern.

## Adding a page

1. Create `features/<name>/routes/<page>.tsx` with a default export.
2. Add its URL to `routePatterns` and `paths` in `shared/lib/routes.ts`.
3. Add it to the feature's `index.ts`:

   ```ts
   export const labelRoutes: FeatureRoute[] = [
     { path: routePatterns.labels, load: () => import("./routes/labels-page") },
   ]
   ```

   `load` must be a dynamic import — that is what keeps each page in its own
   chunk and off the startup path. Use `layout: "bare"` for a page that owns
   the whole window (the editor).
4. For a new feature, spread its routes into `app/route-table.ts`.
5. To show it in the sidebar, add an entry to `app/navigation.ts`.

## Adding a labeling type

A project's labeling UI is driven by its labeling config (objects = the data
shown, controls = how it is labeled). Configs that match a specialized editor
(image canvas, text, audio, video, table) open there; everything else opens in
the config-driven editor (`features/studio/components/editors/custom`), which is
built from three registries. Extend the registry — never add a branch:

| To support… | Add | Then list the tag in (`shared/lib/label-config/support.ts`) |
| --- | --- | --- |
| a new data object (`<Chat>`, `<Paragraphs>`, …) | a viewer in `editors/custom/object-viewers.tsx` | `VIEWER_OBJECT_TAGS` |
| a new whole-item control (`<Ranker>`, `<DateTime>`, …) | a widget in `shared/components/label-config/controls/control-registry.ts` | `STANDALONE_CONTROL_TAGS` |
| a new region control on an object | drawing support in that object's viewer | `REGION_CONTROLS_BY_OBJECT` |

Tests fail if a registry and its list drift apart. A template is "available"
exactly when `isConfigSupported(config)` is true, so unlocking a tag makes every
template waiting on it selectable — there is no per-template flag to flip.

To add a template: one entry in `LABELING_TEMPLATES`
(`shared/lib/label-config/labeling-templates.ts`) and, unless the generic
(modality, task) starter fits, a config in `CONFIG_BY_ID` (`generate.ts`). If
its files are a new kind, add a descriptor to
`features/projects/model/modality-registry.ts`.

## Sample projects

**Projects → Samples → Create sample projects** seeds one ready-to-label
project per template (`features/projects/model/seed`). Items are planned from
each template's config (`plan-sample-items.ts`) and generated in code — images,
WAV audio, HTML, CSV series and PDFs — into `<app data>/samples/<template id>/`.
It is safe to re-run (existing samples are skipped) and **Remove sample
projects** deletes only what it created (projects tagged
`metadata.sampleTemplateId`). Video samples have no clips: those are imported
inside the editor.

## Adding a backend call

1. Add the command to `shared/ipc/studio.ts`.
2. Expose it from the matching object in `shared/services/`.
3. Call the service from a view model.

## Before you push

```bash
yarn typecheck && yarn lint && yarn test
```
