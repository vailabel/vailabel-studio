# Architecture — DDD Modular Monolith (Phases 1–5)

VaiLabel Studio's backend is a **modular monolith** organized by business domain
and layered with **Clean Architecture**. This document describes the crate
workspace and the dependency rule that `vailabel-arch-tests` enforces.

## The dependency rule

Dependencies point **inward**. Infrastructure → Application → Domain. The domain
never depends on a database, transport, UI, or external service.

```
vailabel-core      pure abstractions          (serde, thiserror only)
   ▲
vailabel-shared    shared kernel + event port (core + serde/uuid/chrono)
   ▲
<module> crates    domain / application / contracts  (pure)
   │                       └── infrastructure         (typed Diesel)
   ▼                                  │
vailabel-db        shared SQLite connection  ◄────────┘   (diesel + libsqlite3-sys)
   ▲
vailabel-studio    the Tauri binary = composition root (tauri, opendal, ort,
                   reqwest, fs, process — wires it all)
```

- **`core`** depends on nothing internal. It is the root.
- **`shared`** depends only on `core`. It provides the clock, ids, `PortError`,
  and the event ports — the `EventPublisher` port plus an `EventBus` (fans a
  published event out to N subscribers) and the `EventSubscriber` trait.
  (Persistence is per-module, so there is no generic persistence port.)
- **`vailabel-db`** owns the one shared `SqliteConnection` (a single database is
  shared infrastructure). It exposes a cloneable `Db` handle (`lock`/`with_conn`/
  `transaction`) and re-exports `diesel`. It is *not* a pure crate. `Db::transaction`
  is the unit-of-work boundary (commit on `Ok`, rollback on `Err`).
- **module crates** (`project`, `dataset`, `annotation`, `training`, `cloud`,
  `search`, `models`, `copilot`, `workspace`, plus `analysis`/`video`) depend on
  `core`/`shared`. Their `domain`/`application`/`contracts` layers are **pure**.
  Modules that own persistence (`project`, `dataset`, `annotation`→labels +
  annotations + predictions, `training`, `models`→ai_models + runtime_models,
  `workspace`→settings + history + secret-keys, `analysis`→reports, `video`→
  videos/tracks) add an `infrastructure/` layer with the module's own
  `diesel::table!` + Row mapping + typed repository over the shared `vailabel-db`;
  `cloud`'s `infrastructure/` wraps OpenDAL instead. A module whose work is
  infrastructural but carries no persistence of its own (`copilot`) stays **fully
  pure** and declares **outbound ports** that the composition root implements (see
  *Outbound ports*).
- **`plugin`** is a pure framework crate: object-safe capability traits
  (Detector/Segmenter/Ocr/Exporter/Trainer/Embedding, `&Value → DomainResult<Value>`)
  + a `PluginRegistry` that tracks each plugin's `PluginState` lifecycle and
  offers typed lookup. Concrete plugins live at the composition root.
- **`runtime`** is the anti-corruption layer to the Python runtime; it re-exports
  the Tauri-free `runtime-manager` crate (excluded from the purity rule).
- The **binary** (`vailabel-studio`) is the composition root, organized by
  **vertical feature slice**: `src/lib.rs` holds `AppState` + `AppError` + `run()`
  (wiring + the `generate_handler!` registry); `src/shared/` holds the cross-cutting
  kernel (JSON entity helpers, `studio://domain-event` emission, the
  `TauriEventSubscriber`, keychain helpers); and `src/features/<slice>/` holds one
  folder per bounded context — each with its `commands.rs` (the `#[tauri::command]`
  handlers) next to the composition-root adapters it needs (`service.rs`, port
  impls). Slices: `projects`, `annotation` (labels + annotations), `workspace`
  (settings/history/secrets), `dataset` (images + YOLO), `ai`, `copilot`,
  `analysis`, `video`, `cloud`, `runtime`, `training`, `plugins`, `system`. A Tauri
  command just dispatches to its slice's service/app-service. It opens the `Db`,
  runs the embedded `migrations/` (the single source of truth for the schema),
  builds each module's Diesel repository, registers the `EventBus`'s subscribers
  (`TauriEventSubscriber` in `src/shared/composition.rs`, which emits on
  `studio://domain-event`), builds the `PluginRegistry` (registering concrete
  plugins like the runtime-backed `RuntimeDetectorPlugin` in
  `src/features/plugins/detector.rs`), wires the application services, and exposes
  Tauri commands. There is no
  generic persistence facade: `AiService`, the copilot ports, the dataset
  import/export commands, and the runtime-model glue each hold the typed module
  repositories they actually use and persist through them directly. `AiService`,
  which still shapes `serde_json::Value` internally, does so over a small private
  `RepoStore` shim (in `src/ai/service.rs`) that deserializes each JSON payload
  into the owning module's aggregate and calls its repository — the dual-key
  `to_value()` (camel + snake) vs plain-serde split per kind keeps the wire
  format identical. Every entity is persisted through the repository pattern.

A module must not reach into another module's persistence. Cross-module
communication goes through public contracts and domain events.

## Domain events & the unit of work

A mutating use case runs inside a `Db::transaction` (existence-check + write in
one atomic step — no get-then-write race) and, **after the transaction commits**,
raises a typed domain event (`ProjectEvent`/`ImageEvent`/`LabelEvent`, each
`impl core::DomainEvent`). The application service publishes it through the
`EventPublisher` port, which the composition root backs with an `EventBus` that
fans the event out to its subscribers. The only subscriber today is the
`TauriEventSubscriber` (UI refresh via `studio://domain-event`); audit or
integration subscribers can be added at the composition root without touching any
module. The domain never names the transport.

## Plugin framework

AI capabilities are pluggable. The `plugin` crate defines object-safe capability
traits (`DetectorPlugin`/`SegmenterPlugin`/`OcrPlugin`/`ExporterPlugin`/
`TrainerPlugin`/`EmbeddingPlugin`, each `&Value → DomainResult<Value>`) and a
`PluginRegistry` that registers plugins, looks them up by id/kind, and drives the
`PluginState` lifecycle (`Installed → Loaded → Enabled ⇄ Disabled`, `→ Unloaded`)
as a validated state machine. Concrete plugins live at the composition root,
where they may use infrastructure — e.g. `RuntimeDetectorPlugin` (`src/plugins.rs`)
bridges the framework to the runtime ACL. The registry is held in `AppState`; the
`plugins_list` command surfaces the installed plugins to the UI. (Routing the
inference commands *through* the registry is a later, load-bearing step.)

## Outbound ports

Some use cases need infrastructure the domain must not name — an HTTP LLM, the
ONNX inference engine, the embedded Python runtime. The application layer
declares an **outbound port** (an object-safe trait over plain domain/JSON
types) and the composition root implements it, so the module stays pure:

- **`training`** — `TrainingRuntime` (**async**, `async-trait`; backed by the
  `runtime-manager` ACL + `RuntimeService` in `src/training_runtime.rs`).
  `TrainingAppService` persists the `TrainingRun` through its Diesel repo and
  drives the trainer through the port.
- **`copilot`** — `CopilotLlm` + `CopilotInference` (**sync** — the LLM client is
  `reqwest::blocking` and the Tauri commands already `spawn_blocking`).
  `CopilotAppService` orchestrates one chat turn (route → optional LLM plan →
  dispatch → the per-capability handlers + `test_connection`) against the two
  ports; `src/copilot_ports.rs` implements them over the local OpenAI-compatible
  client and the binary's `AiService` (the shared predictions/pipeline engine,
  which still emits `predictions:generated`). The copilot crate holds no
  HTTP/Tauri/inference code; reply-path errors cross as bare strings so the
  user-facing text stays byte-identical.

## Module layout

```
<module>/src/
  domain/          entities, value objects, domain events, repository traits, errors  ── pure
  application/     commands, queries, handlers, services (CQRS)                        ── pure
  contracts/       public events / requests / responses                               ── pure
  infrastructure/  the module's diesel schema + Row + typed repository (over vailabel-db)
```

`project` is the fully-wired reference. Per-module Diesel persistence now covers
`project`, `dataset` (images), `annotation` (`LabelClass` + `Annotation` +
`Prediction`), `training` (`TrainingRun`), `models` (`AiModel` + `RuntimeModel`),
`workspace` (settings + history + secret-keys), `analysis` (reports; source rows
read through the dataset/annotation repos), and `video` (videos/tracks JSON
blobs). `cloud` persists via OpenDAL. `copilot` is a pure module driven through
outbound ports (above). `search` is still a boundary stub.

Pure conversion logic that the Tauri commands used to inline now lives in the
owning crate's `domain`: `dataset::domain::yolo` (the YOLO ⇄ annotation geometry
for export/import) and `training::domain::results` (parsing ultralytics'
`results.csv`). The filesystem/runtime orchestration around them stays at the
composition root as thin adapters — `src/features/dataset/service.rs`
(`DatasetService`, walks/writes the dataset folder) and
`src/features/training/ops.rs` (training + export coordination over the runtime +
AI services) — so each slice's `commands.rs` handlers are one-line dispatchers.

## Enforcement

`vailabel-arch-tests` (run by `cargo test`) distinguishes two tiers:

- **Fully pure crates** (`core`, `shared`, `plugin`, `copilot`, `search`): the
  ENTIRE `src/` must be free of infrastructure imports
  (`diesel::`/`tauri::`/`rusqlite::`/`reqwest::`/`opendal::`/`ort::`/`std::process`/
  `std::fs`), and the `Cargo.toml` must declare no infrastructure dependency.
  `copilot` qualifies because its inference/LLM work lives behind outbound ports.
- **Layered module crates** (`project`, `dataset`, `annotation`, `training`,
  `cloud`, `video`, `analysis`, `models`, `workspace`): their
  `domain`/`application`/`contracts` layers must stay pure
  (scanned at folder granularity), but `infrastructure/` may use its backing
  technology — `diesel` + `vailabel-db`, or (for `cloud`) `opendal`.
- `core` must depend on nothing internal.

The scanner strips comments before matching (so doc text is safe) and self-tests
that it catches real usage. The compiler additionally enforces the crate DAG.

## Phase status

- **Phase 1** — workspace, pure `core`/`shared`, the `project` reference module,
  domain-model extraction across modules, and the enforcement above.
- **Phase 2** — per-module typed-Diesel persistence: the shared `vailabel-db`
  connection; `project`/`dataset`/`annotation` migrated to their own
  `infrastructure/` Diesel repositories; the generic JSON port + `common` service
  layer removed.
- **Phase 3** — domain events through an in-process `EventBus`/`EventSubscriber`
  (typed `ProjectEvent`/`ImageEvent`/`LabelEvent`); the unit-of-work boundary as
  `Db::transaction` + atomic `save_atomic`/`delete_returning` repo methods. The
  dead `core::UnitOfWork` (commit-style) and `core::EventEnvelope` were removed.
- **Phase 4** — plugin framework made usable: object-safe capability traits + a
  `PluginRegistry` (lifecycle state machine, typed lookup), a runtime-backed
  reference plugin registered in `AppState`, and a `plugins_list` command. The
  runtime module was already the ACL (`runtime-manager`). The dead `&mut`-self
  `PluginLifecycle` trait was removed (lifecycle is the registry state machine).
- **Phase 5** — Training Studio + Copilot moved behind outbound ports (see
  *Outbound ports*). `training` became a full layered module: the `TrainingRun`
  aggregate + `TrainingStatus`/`TrainingEvent`, its own `training_jobs` Diesel
  repository, `TrainingAppService`, and the async `TrainingRuntime` port; the
  residual store's training plumbing was deleted (the module owns the table).
  `copilot`'s pure decision logic (intent router, LLM plan parser, QA-diff,
  label parsing, `CopilotLlmConfig`) moved into the crate; `CopilotAppService`
  now orchestrates a turn against the sync `CopilotLlm` + `CopilotInference`
  ports, and the binary's duplicate `AiService` copilot code was removed. Tauri
  command responses and the `studio://domain-event` wire format are unchanged.
  (Alongside this, the cloud storage module was extracted into the layered
  `cloud` crate over OpenDAL.)
- **Phase 6 (storage restructure)** — every entity now persists through the
  per-module repository pattern and `migrations/` is the single source of truth.
  `diesel_migrations` runs the embedded `migrations/` at startup (the runtime
  `CREATE TABLE` bootstrap was removed). The remaining JSON-blob entities moved
  onto typed Diesel repositories: `annotation` gained the `Annotation` +
  `Prediction` aggregates; `models` gained `AiModel` + `RuntimeModel`; the new
  `workspace` crate owns settings + history + the secret-key registry; the
  `analysis`/`video` crates absorbed their Diesel impls (replacing the binary
  adapters over the old store). The monolithic `DesktopStore` (Row structs +
  camel/snake JSON converters) was deleted. The residual generic `EntityStore`
  trait + `RepositoryEntityStore` adapter (`src/store.rs` / `src/repo_entity_store.rs`)
  were then removed too: each consumer now holds the typed module repositories it
  uses, and `AiService` keeps a private per-kind `RepoStore` shim for its internal
  JSON shaping. Typed aggregates serialize camelCase and re-emit the snake_case
  aliases the frontend reads via `to_value()`, so Tauri responses + the
  `studio://domain-event` wire format are unchanged. The dead `tasks` table is no
  longer modeled.

Deferred to later phases: routing the inference commands through the
`PluginRegistry` (so plugins are the execution path) + more concrete plugins;
fully retyping `AiService`'s internal JSON shaping onto the typed aggregates (it
no longer goes through a generic facade, but still shapes `Value` over the
private `RepoStore` shim rather than working in typed aggregates end to end);
routing `copilot_apply_action` through a module; cross-process/integration event
transport; the React feature reorg.
(`--no-default-features` still has the pre-existing `ai/service.rs` build break,
tracked separately.)
