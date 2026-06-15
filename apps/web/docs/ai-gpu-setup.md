---
title: AI & GPU Setup (ONNX Runtime + CUDA)
description: Enable local AI detection in Vision AI Label Studio and accelerate it with an NVIDIA GPU using ONNX Runtime and CUDA.
category: Issues
tags: [setup, ai, gpu, cuda, onnx]
lastUpdated: June 14, 2026
---

# AI & GPU Setup (ONNX Runtime + CUDA)

The AI features in Vision AI Label Studio — automatic detection, segmentation,
and the [offline copilot](/docs/ai-copilot) — run locally through **ONNX
Runtime**. ONNX Runtime is **not bundled** with the app: it is loaded at runtime
so you can choose a CPU or GPU build that matches your machine. If the app can't
find a compatible runtime, AI detection silently does nothing.

You can always check the current state in the app:
**AI Models page → Inference Runtime**. It reports the real status, such as
`ONNX Runtime: Loaded`, `GPU (CUDA): Active`, or an error explaining what is
wrong.

## Quick path (Windows): let the app install it

When ONNX Runtime isn't loaded, the **Inference Runtime** panel shows a
**Download & install (GPU)** button. It downloads Microsoft's ONNX Runtime GPU
build (matching the app's version) plus cuDNN 9 — about **1 GB** — into the app's
data folder, then asks you to **restart**.

After the restart the runtime loads automatically. If CUDA/cuDNN can't be used,
it falls back to CPU. You still need an NVIDIA driver and the CUDA 12 runtime on
the host for GPU acceleration (covered below).

## Want it working on CPU first?

Any matching **CPU** build of ONNX Runtime
(`onnxruntime-win-x64-<version>.zip`) placed next to the app makes detection work
without a GPU. Add the GPU package and cuDNN later for acceleration — the panel
will show `GPU (CUDA): CPU only` until you do.

## Manual GPU setup (Windows x64, NVIDIA)

If you'd rather set things up by hand, or need to troubleshoot:

1. **Download the ONNX Runtime GPU package.** From the
   [ONNX Runtime releases](https://github.com/microsoft/onnxruntime/releases),
   grab the Windows x64 **GPU** package:
   `onnxruntime-win-x64-gpu-<version>.zip`.
   - Newer GPUs (e.g. NVIDIA Blackwell / RTX 50-series) need a build made with
     **CUDA 12.8+**. If the Inference Runtime panel reports a version mismatch,
     switch to the version it names.

2. **Copy the DLLs** from the zip's `lib/` folder next to the installed
   `vailabel-studio.exe` (or into an `onnxruntime/` subfolder beside it):
   - `onnxruntime.dll`
   - `onnxruntime_providers_shared.dll`
   - `onnxruntime_providers_cuda.dll`

   *Or* point the app at a specific DLL with an environment variable instead of
   copying:

   ```powershell
   setx ORT_DYLIB_PATH "C:\path\to\onnxruntime-win-x64-gpu-<version>\lib\onnxruntime.dll"
   ```

   Restart the terminal and the app after running `setx`.

3. **Install cuDNN 9 for CUDA 12** and make sure these folders are on your
   `PATH`:
   - `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\bin`
   - your cuDNN `bin` folder

4. **Restart the app.** Open **AI Models → Inference Runtime** — it should show
   `ONNX Runtime: Loaded` and `GPU (CUDA): Active`. Run an AI detection or ask
   the copilot to "detect objects".

## How the app finds ONNX Runtime

On startup, if `ORT_DYLIB_PATH` isn't set, the app searches for
`onnxruntime.dll` in this order and pins the first match (so it won't grab the
incompatible Windows system copy in `System32`):

1. next to the executable
2. `<executable dir>/onnxruntime/`
3. `<app data dir>/onnxruntime/`

Set `ORT_DYLIB_PATH` to override this and point at a specific DLL.

## Troubleshooting

Always read the **Inference Runtime** panel first — it names the actual problem.

| Panel shows | Cause | Fix |
|---|---|---|
| `ONNX Runtime: Not loaded` + error | No / incompatible `onnxruntime.dll` | Click **Download & install (GPU)**, or use a matching version and pin `ORT_DYLIB_PATH` |
| `GPU (CUDA): CPU only` | CPU-only build, or CUDA/cuDNN not on `PATH` | Use the **GPU** package; add CUDA + cuDNN `bin` to `PATH` |
| Detect does nothing, no error | Runtime not found at all | Confirm the DLLs are next to the app or that `ORT_DYLIB_PATH` is set |

> **Why the Windows system copy doesn't work:** the `onnxruntime.dll` shipped in
> `C:\Windows\System32` is CPU/DirectML-only (no CUDA provider) and is usually a
> version mismatch. The app deliberately avoids it.
