"""In-process training job table + background runner.

The runner here is a PLACEHOLDER that simulates epochs so the end-to-end
pipeline (queue → run → complete, live logs, progress) is demonstrable without
GPU weights. Replace `_run` with a dispatch to real trainers under `training/`
(e.g. ultralytics for YOLO/RT-DETR) as adapters are implemented.
"""

import os
import threading
import time

_jobs = {}
_lock = threading.Lock()


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


def _run(job_id: str, spec: dict, log_path: str) -> None:
    config = spec.get("config") or {}
    try:
        epochs = int(config.get("epochs", 5))
    except (TypeError, ValueError):
        epochs = 5

    _append_log(log_path, f"[runtime] starting {spec.get('model_family')} training ({epochs} epochs)")
    _append_log(log_path, "[runtime] NOTE: placeholder trainer — wire a real trainer under training/")

    for epoch in range(1, epochs + 1):
        with _lock:
            if _jobs[job_id]["cancel"]:
                _jobs[job_id]["status"] = "canceled"
                _append_log(log_path, "[runtime] canceled")
                return
            loss = round(1.0 / epoch, 4)
            _jobs[job_id]["progress"] = epoch / epochs
            _jobs[job_id]["metrics"] = {"epoch": epoch, "loss": loss}
        _append_log(log_path, f"[runtime] epoch {epoch}/{epochs} loss={loss}")
        time.sleep(0.5)

    with _lock:
        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["progress"] = 1.0
    _append_log(log_path, "[runtime] completed")


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
