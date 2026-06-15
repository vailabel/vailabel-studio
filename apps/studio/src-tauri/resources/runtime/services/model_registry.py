"""Resolves model weights from the local `--models-dir` by path.

The runtime NEVER downloads — the Rust Model Manager downloads weights into
app-data and passes a local `model_path` on every request. This module just
locates/validates those local files.
"""

import os


def resolve(model_path: str) -> str:
    """Validate and return a local model path, raising if it's missing."""
    if not model_path:
        raise FileNotFoundError("no model_path provided")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"model not found on disk: {model_path}")
    return model_path
