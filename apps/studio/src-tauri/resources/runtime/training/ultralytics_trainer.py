"""Real training for YOLO / RT-DETR via ultralytics.

`job_manager` calls `train(...)`, passing callbacks so this module reports
progress, metrics and log lines back into the job table without importing it
(keeps the dependency one-way). Cancellation is cooperative: `is_canceled()` is
checked each epoch and flips ultralytics' `trainer.stop`.
"""

import importlib.util
import os
from typing import Any, Callable, Dict

# Sensible base weights per family when the caller doesn't pass `config.model`.
_DEFAULT_WEIGHTS = {
    "yolo": "yolo11n.pt",
    "rtdetr": "rtdetr-l.pt",
}


def available() -> bool:
    """True when ultralytics is importable in this runtime build."""
    return importlib.util.find_spec("ultralytics") is not None


def _metrics(trainer: Any) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    epoch = getattr(trainer, "epoch", None)
    if epoch is not None:
        out["epoch"] = int(epoch) + 1
    label_loss = getattr(trainer, "label_loss_items", None)
    loss = getattr(trainer, "loss_items", None)
    try:
        if callable(label_loss) and loss is not None:
            for key, val in label_loss(loss).items():
                out[str(key)] = float(val)
    except Exception:  # noqa: BLE001
        pass
    return out


def train(
    spec: Dict[str, Any],
    log_path: str,
    set_progress: Callable[[float, Dict[str, Any]], None],
    append_log: Callable[[str], None],
    is_canceled: Callable[[], bool],
) -> None:
    """Run an ultralytics training job to completion (or cancellation)."""
    from ultralytics import RTDETR, YOLO

    config = spec.get("config") or {}
    family = (spec.get("model_family") or "yolo").lower()
    base = config.get("model") or config.get("weights") or _DEFAULT_WEIGHTS.get(family, "yolo11n.pt")
    try:
        epochs = int(config.get("epochs", 100))
    except (TypeError, ValueError):
        epochs = 100

    model = RTDETR(base) if family == "rtdetr" else YOLO(base)

    # Track the latest epoch metrics so the final report can carry them
    # alongside the trained weights path (set_progress replaces metrics).
    last: Dict[str, Any] = {"metrics": {}}

    def on_epoch_end(trainer: Any) -> None:
        if is_canceled():
            trainer.stop = True
            return
        current = int(getattr(trainer, "epoch", 0)) + 1
        metrics = _metrics(trainer)
        last["metrics"] = metrics
        set_progress(current / max(1, epochs), metrics)
        append_log(f"[runtime] epoch {current}/{epochs} {metrics}")

    model.add_callback("on_train_epoch_end", on_epoch_end)

    dataset_path = spec.get("dataset_path")
    append_log(
        f"[runtime] ultralytics {family} training — base={base}, epochs={epochs}, data={dataset_path}"
    )

    train_kwargs: Dict[str, Any] = {
        "data": dataset_path,
        "epochs": epochs,
        "imgsz": int(config.get("imgsz", 640)),
        "exist_ok": True,
        "verbose": False,
        "project": config.get("project") or (os.path.dirname(log_path) or None),
        "name": config.get("name") or spec.get("job_id"),
    }
    if config.get("batch") is not None:
        train_kwargs["batch"] = config["batch"]
    if config.get("device") is not None:
        train_kwargs["device"] = config["device"]
    # Forward any other ultralytics-native keys verbatim.
    for key, val in config.items():
        if key not in train_kwargs and key not in ("model", "weights", "epochs", "imgsz"):
            train_kwargs[key] = val

    model.train(**train_kwargs)

    # Report where the best/last weights landed so the app can export them to
    # ONNX and use the result for auto-labeling (the train→auto-label loop).
    trainer = getattr(model, "trainer", None)
    final = dict(last["metrics"])
    best = getattr(trainer, "best", None)
    save_dir = getattr(trainer, "save_dir", None)
    if best:
        final["weights"] = str(best)
    if save_dir:
        final["save_dir"] = str(save_dir)
    if final:
        set_progress(1.0, final)
        append_log(f"[runtime] best weights: {final.get('weights', '?')}")
