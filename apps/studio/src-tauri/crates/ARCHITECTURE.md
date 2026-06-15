# Architecture — DDD Modular Monolith (Phases 1–2)

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
- **`shared`** depends only on `core`. It provides the clock, ids, the
  [`EventPublisher`] port, and `PortError`. (Persistence is per-module, so there
  is no generic persistence port.)
- **`vailabel-db`** owns the one shared `SqliteConnection` (a single database is
  shared infrastructure). It exposes a cloneable `Db` handle (`lock`/`with_conn`)
  and re-exports `diesel`. It is *not* a pure crate.
- **module crates** (`project`, `dataset`, `annotation`, `search`, `models`,
  `copilot`, `training`, plus `analysis`/`video`) depend on `core`/`shared`. Their
  `domain`/`application`/`contracts` layers are **pure**; their `infrastructure`
  layer owns the module's own `diesel::table!` + Row mapping + typed repository,
  querying the shared `vailabel-db` connection.
- **`plugin`** is a pure trait crate (capability + lifecycle interfaces).
- **`runtime`** is the anti-corruption layer to the Python runtime; it re-exports
  the Tauri-free `runtime-manager` crate (excluded from the purity rule).
- The **binary** (`vailabel-studio`) is the composition root. It opens the `Db`,
  builds each module's Diesel repository + a `TauriEventPublisher`
  (`src/composition.rs`), wires the application services, and exposes Tauri
  commands. It also keeps the **residual `DesktopStore`** (typed methods + the
  `EntityStore` trait) for entities not yet migrated to a module.

A module must not reach into another module's persistence. Cross-module
communication goes through public contracts and (later) domain events.

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

Deferred to later phases: UnitOfWork/transactions; migrating the remaining
entities and the `ai`/`analysis`/`video` service logic into modules/application
layers; full ai/copilot/models wiring + plugin implementations; runtime-glue
extraction; inter-module domain events; the React feature reorg.
