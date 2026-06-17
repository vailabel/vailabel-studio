# Embedded Python interpreter (provisioned at runtime — not bundled)

This directory is the embedded AI runtime's **hermetic Python interpreter +
site-packages**. End users never install Python.

> **The interpreter is downloaded on first run, not shipped in the installer.**
> It's ~1.5 GB (PyTorch et al.), so bundling it into every platform installer is
> impractical. Instead, the app provisions it on demand into app-data the first
> time AI is used — see `install_runtime` in `src/features/runtime/glue.rs`,
> surfaced via the `runtime_install` command and the "Install AI runtime" prompt
> on the AI page.
>
> Provisioning runs on the user's real machine/arch, so there's no cross-arch
> build problem and **CI does not bundle this directory** — it is intentionally
> absent from `bundle.resources` in `tauri.conf.json`; only `resources/runtime`
> (the FastAPI app + inference code + `requirements.txt`) is bundled.

## Runtime resolution order

The Rust launcher (`crates/runtime-manager/src/launcher.rs`) runs the interpreter
that `python_base` (`src/features/runtime/glue.rs`) resolves, in priority:

1. `VAILABEL_PYTHON_HOME` — an explicit override (dev / testing).
2. `<app_data>/runtime/python` — the runtime-provisioned location (production).
3. A bundled `resources/python` here — back-compat, used only if present.

## Local development

For `tauri dev` you can avoid the in-app download by populating a local
interpreter into this folder with `scripts/build-runtime.{sh,ps1}` (the same two
steps the app performs at install time):

1. A standalone CPython is fetched from
   [python-build-standalone](https://github.com/indygreg/python-build-standalone).
2. `pip install -r ../runtime/requirements.txt` installs FastAPI + uvicorn +
   PyTorch (CPU) + the model adapters into this tree.

Expected layout afterward:

```
resources/python/
├── python.exe            # Windows  (or bin/python3 on macOS/Linux)
├── Lib/ · DLLs/          # stdlib
└── Lib/site-packages/    # fastapi, uvicorn, torch, …
```

Alternatively, set `VAILABEL_PYTHON_HOME` to an existing interpreter, or just run
the in-app "Install AI runtime" once (it lands in `<app_data>/runtime/python`).

The contents here are generated and **must not be committed** (see `.gitignore`).
Model **weights are never placed here** — they download on demand into
`<app_data>/.../models/`.
