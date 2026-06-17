"""Device/GPU introspection. Degrades gracefully when torch isn't installed
(so the runtime still serves /health during dev without the heavy wheel)."""


def _torch():
    try:
        import torch

        return torch
    except Exception:
        return None


def torch_version() -> str:
    t = _torch()
    return t.__version__ if t else ""


def _accelerator(t) -> str:
    """Best available torch device for `t`: "cuda", "mps" (Apple Metal), or "cpu"."""
    try:
        if t and t.cuda.is_available():
            return "cuda"
        mps = getattr(getattr(t, "backends", None), "mps", None)
        if mps is not None and mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def gpu_available() -> bool:
    return _accelerator(_torch()) in ("cuda", "mps")


def gpu_info() -> dict:
    t = _torch()
    accel = _accelerator(t)
    try:
        if accel == "cuda":
            idx = t.cuda.current_device()
            props = t.cuda.get_device_properties(idx)
            used_mb = int(t.cuda.memory_allocated(idx) // (1024 * 1024))
            total_mb = int(props.total_memory // (1024 * 1024))
            return {
                "available": True,
                "name": props.name,
                "backend": "cuda",
                "vram_used_mb": used_mb,
                "vram_total_mb": total_mb,
                "cuda_version": getattr(getattr(t, "version", None), "cuda", None),
            }
        if accel == "mps":
            return {"available": True, "name": "Apple GPU (Metal/MPS)", "backend": "mps"}
    except Exception:
        pass
    return {"available": False}
