"""Health, system and GPU introspection endpoints."""

import os
import platform
import time

from fastapi import APIRouter, Request

from services import device

router = APIRouter()


def _loaded_models() -> list:
    """Keys currently resident in the inference model cache (best-effort)."""
    try:
        from inference.loader import CACHE

        return CACHE.loaded_keys()
    except Exception:
        return []


@router.get("/health")
async def health(request: Request):
    start = getattr(request.app.state, "start_time", time.time())
    return {
        "status": "ok",
        "version": getattr(request.app.state, "version", "0.0.0"),
        "uptime_s": time.time() - start,
        "gpu_available": device.gpu_available(),
        "loaded_models": _loaded_models(),
    }


@router.get("/system")
async def system():
    return {
        "python_version": platform.python_version(),
        "torch_version": device.torch_version(),
        "platform": platform.platform(),
        "cpu_count": os.cpu_count() or 0,
    }


@router.get("/gpu")
async def gpu():
    return device.gpu_info()
