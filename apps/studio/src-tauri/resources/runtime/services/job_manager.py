"""In-process training job table + background runner.

Dispatches by `model_family` to a real trainer under `training/` (ultralytics
for YOLO/RT-DETR) when its deps are installed; otherwise falls back to a
SIMULATED epoch loop so the end-to-end pipeline (queue → run → complete, live
logs, progress) stays demonstrable without GPU weights. Job status/progress/
metrics match the `TrainingJobStatus` wire shape the Rust client expects.
"""

import os
import threading
import time

_jobs = {}
_lock = threading.Lock()

# Families with a real trainer wired under training/.
_REAL_FAMILIES = {"yolo", "rtdetr"}


def start_job(spec: dict) -> None:
    job_id = spec["job_id"]
    log_path = spec.get("log_path") or ""
    with _lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "status": "running",
            "progress": 0.0,
            "metrics": {},
            "error": None,
            "log_path": log_path,
            "cancel": False,
        }
    threading.Thread(target=_run, args=(job_id, spec, log_path), daemon=True).start()


def _append_log(log_path: str, line: str) -> None:
    if not log_path:
        return
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def _set_status(job_id: str, **fields) -> None:
    with _lock:
        job = _jobs.get(job_id)
        if job:
            job.update(fields)


def _set_progress(job_id: str, progress: float, metrics=None) -> None:
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job["progress"] = float(progress)
        if metrics is not None:
            job["metrics"] = metrics


def _is_canceled(job_id: str) -> bool:
    with _lock:
        job = _jobs.get(job_id)
        return bool(job and job["cancel"])


def _run(job_id: str, spec: dict, log_path: str) -> None:
    family = (spec.get("model_family") or "").lower()

    def append(line: str) -> None:
        _append_log(log_path, line)

    # Decide real vs simulated trainer.
    use_real = False
    if family in _REAL_FAMILIES:
        try:
            from training import ultralytics_trainer

            use_real = ultralytics_trainer.available()
        except Exception:
            use_real = False

    try:
        if use_real:
            from training import ultralytics_trainer

            append(f"[runtime] using ultralytics trainer for family '{family}'")
            ultralytics_trainer.train(
                spec,
                log_path,
                lambda p, m=None: _set_progress(job_id, p, m),
                append,
                lambda: _is_canceled(job_id),
            )
        else:
            reason = (
                "ultralytics not installed"
                if family in _REAL_FAMILIES
                else f"no real trainer for family '{family}'"
            )
            append(f"[runtime] {reason} — running simulated trainer")
            _run_simulated(job_id, spec, log_path)
    except Exception as exc:  # noqa: BLE001
        _set_status(job_id, status="failed", error=str(exc))
        append(f"[runtime] failed: {exc}")
        return

    # Finalize (the simulated path sets its own terminal state; this also covers
    # the real path + cancellation).
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return
        if job["cancel"]:
            job["status"] = "canceled"
        elif job["status"] == "running":
            job["status"] = "completed"
            job["progress"] = 1.0
    append("[runtime] canceled" if _is_canceled(job_id) else "[runtime] completed")


def _run_simulated(job_id: str, spec: dict, log_path: str) -> None:
    """Placeholder trainer: simulate epochs so the pipeline is demonstrable."""
    config = spec.get("config") or {}
    try:
        epochs = int(config.get("epochs", 5))
    except (TypeError, ValueError):
        epochs = 5

    _append_log(
        log_path,
        f"[runtime] starting {spec.get('model_family')} training ({epochs} epochs)",
    )

    for epoch in range(1, epochs + 1):
        if _is_canceled(job_id):
            return
        loss = round(1.0 / epoch, 4)
        # `simulated: True` flags that this run produced NO real weights — the UI
        # uses it to explain why the model can't be exported for auto-labeling.
        _set_progress(
            job_id, epoch / epochs, {"epoch": epoch, "loss": loss, "simulated": True}
        )
        _append_log(log_path, f"[runtime] epoch {epoch}/{epochs} loss={loss}")
        time.sleep(0.5)


def stop_job(job_id: str) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["cancel"] = True


def list_jobs() -> list:
    with _lock:
        return [{k: v for k, v in job.items() if k != "cancel"} for job in _jobs.values()]


def read_logs(job_id: str, offset: int = 0) -> dict:
    with _lock:
        job = _jobs.get(job_id)
        path = job.get("log_path") if job else None
    lines, next_offset = [], offset
    if path and os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as fh:
                fh.seek(offset)
                data = fh.read()
                next_offset = fh.tell()
                lines = data.splitlines()
        except Exception:
            pass
    return {"lines": lines, "next_offset": next_offset, "eof": True}
