# Architecture — DDD Modular Monolith (Phases 1–4)

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
                   reqwest, fs, process, the residual DesktopStore — wires it all)
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
- **module crates** (`project`, `dataset`, `annotation`, `search`, `models`,
  `copilot`, `training`, plus `analysis`/`video`) depend on `core`/`shared`. Their
  `domain`/`application`/`contracts` layers are **pure**; their `infrastructure`
  layer owns the module's own `diesel::table!` + Row mapping + typed repository,
  querying the shared `vailabel-db` connection.
- **`plugin`** is a pure framework crate: object-safe capability traits
  (Detector/Segmenter/Ocr/Exporter/Trainer/Embedding, `&Value → DomainResult<Value>`)
  + a `PluginRegistry` that tracks each plugin's `PluginState` lifecycle and
  offers typed lookup. Concrete plugins live at the composition root.
- **`runtime`** is the anti-corruption layer to the Python runtime; it re-exports
  the Tauri-free `runtime-manager` crate (excluded from the purity rule).
- The **binary** (`vailabel-studio`) is the composition root. It opens the `Db`,
  builds each module's Diesel repository, registers the `EventBus`'s subscribers
  (`TauriEventSubscriber` in `src/composition.rs`, which emits on
  `studio://domain-event`), builds the `PluginRegistry` (registering concrete
  plugins like the runtime-backed `RuntimeDetectorPlugin` in `src/plugins.rs`),
  wires the application services, and exposes Tauri commands. It also keeps the
  **residual `DesktopStore`** (typed methods + the `EntityStore` trait) for
  entities not yet migrated to a module.

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

## Module layout

```
<module>/src/
  domain/          entities, value objects, domain events, repository traits, errors  ── pure
  application/     commands, queries, handlers, services (CQRS)                        ── pure
  contracts/       public events / requests / responses                               ── pure
  infrastructure/  the module's diesel schema + Row + typed repository (over vailabel-db)
```

`project` is the fully-wired reference. `project`, `dataset` (images), and
`annotation` (the `LabelClass` aggregate) persist via per-module Diesel. The other
module crates are still type-extracted (`analysis`, `video`, `models`, `copilot`)
or boundary stubs (`search`, `training`).

## Enforcement

`vailabel-arch-tests` (run by `cargo test`) distinguishes two tiers:

- **Fully pure crates** (`core`, `shared`, `plugin`, and the not-yet-migrated
  module crates): the ENTIRE `src/` must be free of infrastructure imports
  (`diesel::`/`tauri::`/`rusqlite::`/`reqwest::`/`opendal::`/`ort::`/`std::process`/
  `std::fs`), and the `Cargo.toml` must declare no infrastructure dependency.
- **Layered module crates** (`project`, `dataset`, `annotation`): their
  `domain`/`application`/`contracts` layers must stay pure (scanned at folder
  granularity), but `infrastructure/` may use `diesel` + `vailabel-db`.
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

Deferred to later phases: routing the inference commands through the
`PluginRegistry` (so plugins are the execution path) + more concrete plugins;
migrating the remaining entities and the `ai`/`analysis`/`video` service logic
into modules/application layers; full ai/copilot/models wiring; runtime-glue
extraction; cross-process/integration event transport; the React feature reorg.
