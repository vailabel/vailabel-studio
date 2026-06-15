# Per-family inference adapters (rtdetr, sam2, florence2, paddleocr, qwen).
# Each module exposes a `run(req)` callable that loads the model from
# `req.model_path` and returns the response shape expected by routers/inference.py.
