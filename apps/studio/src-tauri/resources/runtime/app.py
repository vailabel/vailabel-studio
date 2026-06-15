"""Vailabel embedded AI runtime — FastAPI service.

Launched by the Rust `runtime-manager` as an internal subprocess. Users never
touch this directly; the only client is the Rust HTTP bridge, which sends a
shared bearer token on every request. Bound to loopback only.
"""

import argparse
import os
import sys
import threading
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from routers import export, health, inference, training

RUNTIME_VERSION = "0.1.0"


def build_app(token: str, models_dir: str, log_dir: str) -> FastAPI:
    app = FastAPI(title="Vailabel AI Runtime", version=RUNTIME_VERSION)
    app.state.token = token
    app.state.models_dir = models_dir
    app.state.log_dir = log_dir
    app.state.start_time = time.time()
    app.state.version = RUNTIME_VERSION

    @app.middleware("http")
    async def require_token(request: Request, call_next):
        expected = request.app.state.token
        if expected:
            header = request.headers.get("authorization", "")
            if header != f"Bearer {expected}":
                return JSONResponse(status_code=401, content={"detail": "unauthorized"})
        return await call_next(request)

    app.include_router(health.router)
    app.include_router(inference.router)
    app.include_router(inference.ocr_router)
    app.include_router(training.router)
    app.include_router(export.router)

    @app.post("/shutdown")
    async def shutdown():
        def _stop():
            time.sleep(0.2)
            os._exit(0)

        threading.Thread(target=_stop, daemon=True).start()
        return {"ok": True}

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Vailabel AI runtime")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--token", default="")
    parser.add_argument("--models-dir", dest="models_dir", default="")
    parser.add_argument("--log-dir", dest="log_dir", default="")
    args = parser.parse_args()

    if args.models_dir:
        os.makedirs(args.models_dir, exist_ok=True)

    app = build_app(args.token, args.models_dir, args.log_dir)

    import uvicorn

    try:
        uvicorn.run(app, host=args.host, port=args.port, log_level="info")
    except OSError as exc:
        # Port already taken etc. — exit non-zero so the launcher retries with a
        # fresh port.
        print(f"runtime bind failed: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
