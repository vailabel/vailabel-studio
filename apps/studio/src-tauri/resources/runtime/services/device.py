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


def gpu_available() -> bool:
    t = _torch()
    try:
        return bool(t and t.cuda.is_available())
    except Exception:
        return False


def gpu_info() -> dict:
    t = _torch()
    try:
        if not t or not t.cuda.is_available():
            return {"available": False}
        idx = t.cuda.current_device()
        props = t.cuda.get_device_properties(idx)
        used_mb = int(t.cuda.memory_allocated(idx) // (1024 * 1024))
        total_mb = int(props.total_memory // (1024 * 1024))
        return {
            "available": True,
            "name": props.name,
            "vram_used_mb": used_mb,
            "vram_total_mb": total_mb,
            "cuda_version": getattr(getattr(t, "version", None), "cuda", None),
        }
    except Exception:
        return {"available": False}
