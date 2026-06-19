<div align="center">

# Vailabel Studio

**Local-first, AI-assisted data labeling — a cross-platform desktop studio for images, video, text & audio.**

[![Release](https://img.shields.io/github/v/release/vailabel/vailabel-studio?sort=semver)](https://github.com/vailabel/vailabel-studio/releases/latest)
[![Release build](https://img.shields.io/github/actions/workflow/status/vailabel/vailabel-studio/release.yml?label=release%20build)](https://github.com/vailabel/vailabel-studio/actions/workflows/release.yml)
[![Downloads](https://img.shields.io/github/downloads/vailabel/vailabel-studio/total)](https://github.com/vailabel/vailabel-studio/releases)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

[**Download**](#download) · [Features](#features) · [Quick start](#development) · [Architecture](#architecture) · [Contributing](CONTRIBUTE.md)

</div>

---

## Table of Contents

- [Features](#features)
- [Download](#download)
- [Development](#development)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Overview

**Vailabel Studio** is an open-source desktop annotation tool in the spirit of LabelMe and
Label Studio — but it runs **entirely on your machine**. Your data lives in a local SQLite
database, images are referenced in place (no base64 copies), and everything works offline.
On top of that familiar labeling workflow it adds an **AI layer**: one-click auto-labeling,
click-to-segment, and an on-device assistant.

It's built as a native desktop app with [Tauri](https://tauri.app) (Rust) + React, so you get
a small, fast binary with real filesystem access instead of a browser tab.

<a id="features"></a>

## ✨ Features

### Label anything
- **Images** — bounding boxes, polygons, keypoints, lines, polylines, circles, and free-draw.
- **Video** — frame extraction, scene detection, and object labeling across time (FFmpeg pipeline).
- **Text** — named-entity spans, relations, classification, Q&A, and translation.
- **Audio** — waveform region labeling, diarization, and transcription.
- **Custom** — define your own projects with **Label-Studio-style JSON configs**; a
  config-driven editor renders the right tools automatically.

### AI on top
- **Auto-label** — run a YOLO detection model on the current image and review the suggestions.
- **Smart Segment** — click an object to segment it with SAM (Segment Anything).
- **Copilot** _(experimental)_ — an offline, on-device vision assistant for label suggestions.

### Built for real datasets
- **Local-first** — a single SQLite database; fully offline, your data never leaves your machine.
- **Reference in place** — point at a folder of images; nothing is copied or duplicated.
- **Import / export** — LabelMe sidecars, JSONL, and dataset exports for model training.
- **Cloud storage** _(optional)_ — connect S3, Azure Blob, or Google Cloud Storage; credentials stay in your OS keychain.
- **Label-Studio-style workspace** — a file queue, center canvas with a tool rail, and a docked
  Classes / Regions / AI / Copilot panel.

> **Project status:** Vailabel Studio is under active development. Core image/text/audio/video
> labeling and YOLO/SAM assistance are usable today; the on-device Copilot and embedded training
> runtime are evolving — expect rough edges and breaking changes.

<a id="download"></a>

## ⬇️ Download

Grab the latest installer for your platform from the
**[Releases page](https://github.com/vailabel/vailabel-studio/releases/latest)**:

| Platform | Installer |
| --- | --- |
| **Windows** | `.exe` (setup) or `.msi` |
| **macOS** | `.dmg` — Apple Silicon (`aarch64`) and Intel (`x64`) |
| **Linux** | `.AppImage`, `.deb`, or `.rpm` |

> macOS builds are unsigned for now — if Gatekeeper blocks the app, right-click → **Open** the
> first time (or `xattr -dr com.apple.quarantine /Applications/Vailabel\ Studio.app`).

<a id="development"></a>

## 🛠️ Development

### Prerequisites
- **Node.js** 20+ and **Yarn** (Classic / v1)
- **Rust** (stable toolchain) — install via [rustup](https://rustup.rs)
- The platform build dependencies for Tauri v2 — see the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

### Run it
```bash
# install workspace dependencies
yarn install

# run the full desktop app (Tauri + React)
yarn dev          # alias: yarn desktop

# run just the React UI in the browser (no Rust backend)
yarn studio

# tests, lint, typecheck
yarn test
yarn lint
yarn typecheck

# build production bundles
yarn build        # web + studio frontend
yarn release      # native desktop installers (tauri build)
```

<a id="project-structure"></a>

## 🧱 Project structure

This is a Yarn-workspaces monorepo:

```
apps/
├── studio/                # the Tauri desktop app
│   ├── src/               # React frontend — feature-sliced
│   │   ├── app/           #   router (lazy routes), providers, layout shell
│   │   ├── features/      #   studio · projects · ai-models · labels · …
│   │   └── shared/        #   ui (shadcn-style) · lib · services · ipc · types
│   └── src-tauri/         # Rust backend — Tauri commands + DDD modular crates
│       ├── crates/        #   per-domain crates (pure domain + Diesel/SQLite)
│       └── migrations/    #   the canonical SQLite schema
└── web/                   # marketing / documentation site
```

<a id="architecture"></a>

## 🏗️ Architecture

- **Frontend** — React 19 + Vite + TypeScript + Tailwind v4, organized **feature-first**
  (`app/` + `features/*` + `shared/*`); routes are code-split with `React.lazy`.
- **Desktop shell** — Tauri v2; the React UI talks to Rust over a typed IPC bridge.
- **Backend** — Rust as a **DDD modular monolith**: each domain is its own crate with a pure
  core and a typed [Diesel](https://diesel.rs) repository over a shared SQLite connection.
  Embedded migrations are the single source of truth for the schema.

<a id="contributing"></a>

## 🤝 Contributing

Contributions are welcome! Please read **[CONTRIBUTE.md](CONTRIBUTE.md)** to get set up, and
our **[Code of Conduct](CODE_OF_CONDUCT.md)** before opening a pull request. Found a security
issue? See **[SECURITY.md](SECURITY.md)** — please don't file it as a public issue.

<a id="license"></a>

## 📄 License

Vailabel Studio is licensed under the **[Apache License 2.0](LICENSE)**.

<div align="center">
<sub>Built with Tauri, React & Rust — by <a href="https://github.com/vailabel">Vailabel</a> and contributors.</sub>
</div>
