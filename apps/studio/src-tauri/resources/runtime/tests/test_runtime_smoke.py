"""Structural smoke tests for the embedded runtime.

These run WITHOUT the heavy ML wheels (ultralytics/transformers/paddleocr): they
prove the lazy-import design holds (no import-time crash), that adapters fail
with the typed dependency error when their deps are absent, that exporters
degrade to `ok: false`, and that the simulated trainer runs end-to-end.

Runnable two ways:
    pytest resources/runtime/tests/
    python resources/runtime/tests/test_runtime_smoke.py   # no pytest needed
"""

import os
import sys
import time
from types import SimpleNamespace

# Put the runtime root (parent of tests/) on sys.path so `inference`, `services`,
# `routers`, `app` resolve the same way they do under `python app.py`.
RUNTIME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if RUNTIME_DIR not in sys.path:
    sys.path.insert(0, RUNTIME_DIR)


def _has(module: str) -> bool:
    import importlib.util

    return importlib.util.find_spec(module) is not None


def test_adapter_modules_import_without_heavy_deps():
    """Importing adapters must not pull in torch/ultralytics/etc."""
    import inference.loader  # noqa: F401
    import inference.detect  # noqa: F401
    import inference.segment  # noqa: F401
    import inference.florence  # noqa: F401
    import inference.qwen  # noqa: F401
    import inference.paddle  # noqa: F401
    import export._common  # noqa: F401
    import export.onnx  # noqa: F401
    import export.tensorrt  # noqa: F401
    import export.openvino  # noqa: F401
    import training.ultralytics_trainer  # noqa: F401
    import services.job_manager  # noqa: F401


def test_routers_and_app_build():
    """FastAPI app + routers wire up (needs fastapi/pydantic, present in the
    bundled interpreter)."""
    if not _has("fastapi"):
        print("  (skipped: fastapi not installed in this interpreter)")
        return
    import app

    built = app.build_app(token="t", models_dir="", log_dir="")
    routes = {r.path for r in built.routes}
    assert "/health" in routes
    assert "/inference/object-detection" in routes
    assert "/ocr" in routes
    assert "/training/start" in routes
    assert "/export/onnx" in routes


def test_infer_family():
    from inference.loader import infer_family

    assert infer_family("/m/rtdetr/rtdetr-l.pt") == "rtdetr"
    assert infer_family("/m/sam2/sam2_b.pt") == "sam2"
    assert infer_family("/m/florence2/model.safetensors") == "florence2"
    assert infer_family("/m/qwen/x") == "qwen"
    assert infer_family("/m/paddleocr/x") == "paddleocr"
    assert infer_family("/m/whatever/yolov8n.pt") == "yolo"
    assert infer_family("ignored", explicit="RTDETR") == "rtdetr"


def test_inference_adapters_raise_dependency_error_when_absent():
    from inference import detect, paddle, qwen, segment
    from inference.loader import RuntimeDependencyError

    req = SimpleNamespace(
        model_path="/no/such/model.pt", image_path="/no/such/img.jpg", conf=0.25, iou=0.5,
        points=[], box_xyxy=None, prompt=None,
    )
    for fn in (detect.run, segment.run, paddle.run, qwen.run_caption):
        if _has(_dep_for(fn)):
            continue  # the dep IS installed; skip the absence assertion
        try:
            fn(req)
            assert False, f"{fn.__module__}.{fn.__name__} should have raised"
        except RuntimeDependencyError:
            pass


def _dep_for(fn) -> str:
    return {
        "inference.detect": "ultralytics",
        "inference.segment": "ultralytics",
        "inference.paddle": "paddleocr",
        "inference.qwen": "transformers",
    }.get(fn.__module__, "ultralytics")


def test_exporters_degrade_to_ok_false_when_absent():
    from export import onnx, openvino, tensorrt

    req = SimpleNamespace(model_path="/no/such/model.pt", output_path="/tmp/out.onnx", opts={})
    for mod in (onnx, tensorrt, openvino):
        result = mod.run(req)
        assert result["ok"] is False
        assert result["error"]  # a non-empty, explanatory message


def test_simulated_trainer_runs_end_to_end(tmp_path=None):
    from services import job_manager

    log_path = os.path.join(
        tmp_path if tmp_path else os.path.join(RUNTIME_DIR, "tests", "_tmp"),
        "job.log",
    )
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    job_id = "smoke-job"
    # An unknown family forces the simulated path regardless of installed deps.
    job_manager.start_job(
        {
            "job_id": job_id,
            "project_id": "p",
            "model_family": "unknown-sim",
            "dataset_path": "/data",
            "config": {"epochs": 2},
            "log_path": log_path,
        }
    )
    deadline = time.time() + 10
    status = "running"
    while time.time() < deadline:
        jobs = {j["job_id"]: j for j in job_manager.list_jobs()}
        status = jobs[job_id]["status"]
        if status in ("completed", "failed", "canceled"):
            break
        time.sleep(0.1)
    assert status == "completed", f"expected completed, got {status}"
    chunk = job_manager.read_logs(job_id)
    assert any("epoch 2/2" in line for line in chunk["lines"])


def main() -> int:
    tests = [
        test_adapter_modules_import_without_heavy_deps,
        test_routers_and_app_build,
        test_infer_family,
        test_inference_adapters_raise_dependency_error_when_absent,
        test_exporters_degrade_to_ok_false_when_absent,
        test_simulated_trainer_runs_end_to_end,
    ]
    failures = 0
    for t in tests:
        try:
            t()
            print(f"PASS  {t.__name__}")
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"FAIL  {t.__name__}: {exc!r}")
    print(f"\n{len(tests) - failures}/{len(tests)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
