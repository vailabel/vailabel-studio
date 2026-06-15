"""Shared inference infrastructure for the per-family adapters.

Heavy ML libraries (torch, ultralytics, transformers, paddleocr, opencv) are
imported **lazily inside functions** — importing this module never pulls them
in. That keeps /health, /system and /gpu instant, lets the runtime serve even
when a family's deps are absent, and turns a missing dependency into a clean
per-capability error (mapped to HTTP 501 by the router) instead of a crash.

Adapter outputs mirror the Rust `InferenceAnnotationDraft` (camelCase) so the
studio can consume them as predictions later — see
`src-tauri/src/domain/ai/model.rs`. Coordinates are pixel-space: a box is two
points (xyxy as top-left/bottom-right); a polygon is N points (capped at
`MAX_POLYGON_VERTICES`, matching `domain/ai/engines/sam.rs`).
"""

from __future__ import annotations

import importlib
import os
import threading
from collections import OrderedDict
from typing import Any, Callable, Dict, List, Optional, Tuple

# Mirror engines/sam.rs MAX_POLYGON_VERTICES so masks simplify identically.
MAX_POLYGON_VERTICES = 150


class RuntimeDependencyError(RuntimeError):
    """A required ML dependency is not installed in this runtime build.

    Carries a `pip install` hint; routers map this to HTTP 501 so the caller
    surfaces a clear "this family isn't installed" message.
    """

    def __init__(self, module: str, pip: str):
        self.module = module
        self.pip = pip
        super().__init__(
            f"'{module}' is not installed in this runtime build — "
            f"install it with: pip install {pip}"
        )


def lazy_import(module: str, pip: Optional[str] = None):
    """Import a heavy module on demand, raising RuntimeDependencyError if absent.

    Catches any import-time failure (a plain ImportError, or e.g. a torch/CUDA
    initialization error) and re-raises it as the typed dependency error.
    """
    try:
        return importlib.import_module(module)
    except RuntimeDependencyError:
        raise
    except Exception as exc:  # noqa: BLE001 — intentional broad catch
        raise RuntimeDependencyError(module, pip or module) from exc


def pick_device() -> str:
    """Return "cuda" when a GPU is usable, else "cpu". Never raises."""
    try:
        torch = importlib.import_module("torch")
        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:  # noqa: BLE001
        return "cpu"


def load_image(path: str) -> Tuple[Any, Tuple[int, int]]:
    """Load an RGB PIL image, returning (image, (width, height))."""
    if not path or not os.path.exists(path):
        raise FileNotFoundError(f"image not found on disk: {path}")
    pil_image = lazy_import("PIL.Image", "pillow")
    img = pil_image.open(path).convert("RGB")
    return img, img.size


# ---------------------------------------------------------------------------
# Model LRU cache — keeps a couple of heavy models resident across requests.
# ---------------------------------------------------------------------------


def _free(model: Any) -> None:
    """Best-effort release of an evicted model + its VRAM."""
    del model
    try:
        torch = importlib.import_module("torch")
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:  # noqa: BLE001
        pass


class ModelCache:
    """Tiny thread-safe LRU keyed by an opaque string (family + model_path)."""

    def __init__(self, capacity: Optional[int] = None):
        if capacity is None:
            try:
                capacity = int(os.environ.get("VAILABEL_RT_MODEL_CACHE", "2"))
            except ValueError:
                capacity = 2
        self.capacity = max(1, capacity)
        self._items: "OrderedDict[str, Any]" = OrderedDict()
        self._lock = threading.Lock()

    def get_or_load(self, key: str, loader: Callable[[], Any]) -> Any:
        with self._lock:
            if key in self._items:
                self._items.move_to_end(key)
                return self._items[key]
        # Load outside the lock (slow); tolerate a rare double-load race.
        model = loader()
        with self._lock:
            self._items[key] = model
            self._items.move_to_end(key)
            while len(self._items) > self.capacity:
                _, evicted = self._items.popitem(last=False)
                _free(evicted)
        return model

    def loaded_keys(self) -> List[str]:
        with self._lock:
            return list(self._items.keys())


# Process-wide cache shared by every adapter.
CACHE = ModelCache()


# ---------------------------------------------------------------------------
# Family inference + output shaping
# ---------------------------------------------------------------------------

# Ordered so more-specific needles win (e.g. "sam2" before "sam"). Values are
# the canonical family names used across the adapters + the Rust catalog.
_FAMILY_HINTS: Tuple[Tuple[str, str], ...] = (
    ("rtdetr", "rtdetr"),
    ("rt-detr", "rtdetr"),
    ("sam2", "sam2"),
    ("sam", "sam2"),
    ("florence", "florence2"),
    ("qwen", "qwen"),
    ("paddle", "paddleocr"),
    ("yolo", "yolo"),
)


def infer_family(model_path: str, explicit: Optional[str] = None) -> str:
    """Resolve a model family from an explicit hint, the parent dir, or the name.

    The Rust catalog downloads weights into `models/<family>/…` (see glue.rs), so
    the parent directory is the most reliable signal; the filename is a fallback.
    Defaults to "yolo" — ultralytics handles most generic `.pt` detectors.
    """
    if explicit:
        return explicit.strip().lower()
    p = (model_path or "").replace("\\", "/").lower()
    parent = os.path.basename(os.path.dirname(p)) if p else ""
    for needle, fam in _FAMILY_HINTS:
        if needle in parent:
            return fam
    name = os.path.basename(p)
    for needle, fam in _FAMILY_HINTS:
        if needle in name:
            return fam
    return "yolo"


def xyxy_to_points(x1: float, y1: float, x2: float, y2: float) -> List[Dict[str, float]]:
    """A detection box as [top-left, bottom-right] pixel points."""
    return [{"x": float(x1), "y": float(y1)}, {"x": float(x2), "y": float(y2)}]


def draft(
    name: str,
    annotation_type: str,
    coordinates: List[Dict[str, float]],
    confidence: float,
    label_color: Optional[str] = None,
) -> Dict[str, Any]:
    """Build an InferenceAnnotationDraft dict (camelCase) — see domain/ai/model.rs."""
    return {
        "name": name,
        "type": annotation_type,
        "coordinates": coordinates,
        "confidence": float(confidence),
        "labelName": name,
        "labelColor": label_color,
        "isAiGenerated": True,
    }


def mask_to_polygon(mask: Any) -> List[Dict[str, float]]:
    """Convert a binary mask (HxW; bool / 0-1 / 0-255) to a simplified polygon.

    Largest external contour, RDP-simplified (epsilon grows until under the
    vertex cap), returned as pixel-space [{x, y}, …]. Mirrors the Rust SAM path.
    """
    cv2 = lazy_import("cv2", "opencv-python-headless")
    np = lazy_import("numpy")
    m = np.asarray(mask)
    if m.ndim > 2:
        m = m.squeeze()
    if m.dtype != np.uint8:
        m = (m > 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []
    contour = max(contours, key=cv2.contourArea)
    peri = cv2.arcLength(contour, True)
    eps = 0.01 * peri
    approx = cv2.approxPolyDP(contour, eps, True)
    while len(approx) > MAX_POLYGON_VERTICES and eps < peri:
        eps *= 1.5
        approx = cv2.approxPolyDP(contour, eps, True)
    pts = approx.reshape(-1, 2)[:MAX_POLYGON_VERTICES]
    return [{"x": float(pt[0]), "y": float(pt[1])} for pt in pts]
