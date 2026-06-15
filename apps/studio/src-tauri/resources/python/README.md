# Embedded Python interpreter (generated — do not commit binaries)

This directory holds the **hermetic Python interpreter + site-packages** that
Tauri bundles as a resource (`bundle.resources` in `tauri.conf.json`). It is the
embedded AI runtime's interpreter — end users never install Python.

The contents are produced by `scripts/build-runtime.*`, **not** committed:

1. A standalone CPython is fetched from
   [python-build-standalone](https://github.com/indygreg/python-build-standalone).
2. `pip install -r ../runtime/requirements.txt` installs FastAPI + uvicorn +
   PyTorch (CPU) into this tree.

Expected layout after the build:

```
resources/python/
├── python.exe            # Windows  (or bin/python3 on macOS/Linux)
├── Lib/ · DLLs/          # stdlib
└── Lib/site-packages/    # fastapi, uvicorn, torch, …
```

The Rust launcher (`crates/runtime-manager/src/launcher.rs`) resolves
`python.exe` here via `app.path().resource_dir()` and runs `../runtime/app.py`.

> CI must run `scripts/build-runtime` before `tauri build`, otherwise this
> directory is empty and the bundle won't include a working runtime.

Model **weights are never placed here** — they download on demand into
`AppData/.../models/`.
