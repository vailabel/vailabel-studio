# Architecture — DDD Modular Monolith (Phase 1)

VaiLabel Studio's backend is a **modular monolith** organized by business domain
and layered with **Clean Architecture**. This document describes the crate
workspace and the dependency rule that `vailabel-arch-tests` enforces.

## The dependency rule

Dependencies point **inward**. Infrastructure → Application → Domain. The domain
never depends on a database, transport, UI, or external service.

```
vailabel-core      pure abstractions      (serde, thiserror only)
   ▲
vailabel-shared    shared kernel + ports  (core + serde/uuid/chrono)
   ▲
<module> crates    domain / application / infrastructure / contracts
   ▲
vailabel-studio    the Tauri binary = composition root (diesel, tauri, opendal,
                   ort, reqwest, fs, process — all infrastructure lives here)
```

- **`core`** depends on nothing internal. It is the root.
- **`shared`** depends only on `core`. It adds the clock, ids, and the
  `EntitySource` (persistence) and `EventPublisher` (event) **ports**.
- **module crates** (`project`, `dataset`, `annotation`, `search`, `models`,
  `copilot`, `training`, plus `analysis`/`video`) depend on `core`/`shared`
  (and `plugin` where relevant). Their `domain` + `application` layers are pure;
  their `infrastructure` builds on the `shared` ports, never on diesel/tauri.
- **`plugin`** is a pure trait crate (capability + lifecycle interfaces).
- **`runtime`** is the anti-corruption layer to the Python runtime; it re-exports
  the Tauri-free `runtime-manager` crate and is *excluded* from the purity rule
  (it legitimately uses reqwest/tokio).
- The **binary** (`vailabel-studio`) is the only place that knows about both
  abstractions and concrete infrastructure. It implements the ports
  (`EntitySourceAdapter`, `TauriEventPublisher` in `src/composition.rs`), wires
  the application services, and exposes Tauri commands.

A module must not reach into another module's persistence. Cross-module
communication goes through public contracts and (later) domain events.

## Module layout

Each module crate follows:

```
<module>/src/
  domain/          entities, value objects, domain events, repository traits, errors
  application/     commands, queries, handlers, dto, services (CQRS)
  infrastructure/  repository impls over the shared ports, mappers, adapters
  contracts/       public events / requests / responses
```

`project` is the fully-wired reference (domain → application → infrastructure →
contracts, routed through the binary). Other modules are at various Phase-1
stages: type-extracted (`dataset`, `analysis`, `video`, `models`, `copilot`) or
boundary stubs (`annotation`, `search`, `training`).

## Enforcement

`vailabel-arch-tests` (run by `cargo test`) fails the build if a pure crate:

1. imports an infrastructure concern (`diesel::`, `tauri::`, `rusqlite::`,
   `reqwest::`, `opendal::`, `ort::`, `std::process`, `std::fs`), or
2. declares an infrastructure dependency in its `Cargo.toml`, or
3. (for `core`) depends on any internal crate.

The compiler also enforces the crate DAG: a pure crate that has no infra
dependency simply cannot name those types.

## Phase status

Phase 1 establishes the workspace, the pure crates, the reference module
(`project`), domain-model extraction across modules, and this enforcement.
Deferred to later phases: moving SQL out of `store.rs`, migrating the remaining
services (ai/analysis/video/image/label) into application layers, full
ai/copilot/models wiring, plugin implementations, runtime-glue extraction, and
inter-module domain events.
