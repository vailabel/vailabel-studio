# Enabling local YOLO inference (ONNX Runtime + CUDA)

YOLO detection runs through ONNX Runtime via the `ort` crate, built with the
`load-dynamic` feature. **That means ONNX Runtime is *not* bundled** — the app
loads `onnxruntime.dll` at runtime. If it can't find a compatible one, AI detect
silently does nothing. This guide makes it work, with CUDA acceleration.

Check the result any time in the app: **AI Models page → Inference Runtime**. It
now reports the *real* state — `ONNX Runtime: Loaded`, `GPU (CUDA): Active`, or an
error explaining what's wrong.

## Quick path: let the app install it (Windows)

When ONNX Runtime isn't loaded, the **Inference Runtime** panel shows a
**Download & install (GPU)** button. It fetches Microsoft's ONNX Runtime GPU
build (matching this app's version) and cuDNN 9 — about **1 GB** — into the app's
data folder (`<app data>/onnxruntime/`), then asks you to **restart**. After the
restart the runtime loads automatically; if cuDNN/CUDA can't be used it silently
falls back to CPU. You still need an NVIDIA driver + CUDA 12 runtime on the host
for GPU; the manual steps below cover that and any troubleshooting.

## Why it "never worked"

- `ORT_DYLIB_PATH` was unset, so Windows resolved `onnxruntime.dll` to
  `C:\Windows\System32\onnxruntime.dll` — the Windows-ML system copy. It is
  **CPU/DirectML-only (no CUDA provider)** and usually a version mismatch for this
  `ort` build, so loading or session creation fails.
- The status panel reported CUDA from compile-time flags only, so it looked fine.

## How the app finds ONNX Runtime now

On startup, if `ORT_DYLIB_PATH` isn't set, the app looks for `onnxruntime.dll`
in this order and pins the first it finds (so it won't grab the System32 copy):

1. next to the executable
2. `<executable dir>/onnxruntime/`
3. `<app data dir>/onnxruntime/`

You can always override by setting `ORT_DYLIB_PATH` to a specific
`onnxruntime.dll`.

## Steps (Windows x64, NVIDIA GPU)

Your machine already has: NVIDIA driver + CUDA toolkit 12.6, RTX 5070. You need a
**GPU build of ONNX Runtime** and **cuDNN 9**.

1. **Download ONNX Runtime GPU.** From
   <https://github.com/microsoft/onnxruntime/releases>, grab the Windows x64 **GPU**
   package: `onnxruntime-win-x64-gpu-<version>.zip`.
   - The RTX 5070 is Blackwell (sm_120) — use a build made with **CUDA 12.8+**
     (the latest 1.x GPU release). If the Inference Runtime panel later shows a
     version-mismatch error, switch to the version it names.

2. **Copy the DLLs** from the zip's `lib/` folder:
   - `onnxruntime.dll`
   - `onnxruntime_providers_shared.dll`
   - `onnxruntime_providers_cuda.dll`

   Put them **next to the app executable**:
   - Dev (`npm run tauri dev`): `apps/studio/src-tauri/target/debug/`
   - Release build: next to the installed `vailabel-studio.exe` (or in an
     `onnxruntime/` subfolder there).

   *Or* set an env var instead of copying:
   ```powershell
   setx ORT_DYLIB_PATH "C:\path\to\onnxruntime-win-x64-gpu-<version>\lib\onnxruntime.dll"
   ```
   (Restart the terminal/app after `setx`.)

3. **Install cuDNN 9 for CUDA 12** and make sure these are on `PATH`:
   - `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6\bin`
   - your cuDNN `bin` folder

4. **Restart the app** → AI Models → Inference Runtime should show
   `ONNX Runtime: Loaded` and `GPU (CUDA): Active`. Run AI detect or ask the
   copilot to "detect objects".

## Just want it working on CPU first?

Any matching **CPU** ONNX Runtime (`onnxruntime-win-x64-<version>.zip`) dropped in
the same place makes detection work without CUDA. Add the GPU package + cuDNN
afterward for acceleration. The panel will show `GPU (CUDA): CPU only` in that case.

## Troubleshooting (read the Inference Runtime panel)

| Panel shows | Cause | Fix |
|---|---|---|
| `ONNX Runtime: Not loaded` + error | No/incompatible `onnxruntime.dll` | Click **Download & install (GPU)** in the panel, or use a matching version + pin `ORT_DYLIB_PATH` |
| `GPU (CUDA): CPU only` | CPU-only ORT build, or CUDA/cuDNN not on PATH | Use the **gpu** package; add CUDA + cuDNN `bin` to PATH |
| Detect says "build does not include ONNX inference" | Built without the feature | Build with the default features (or `--features yolo-inference`) |
