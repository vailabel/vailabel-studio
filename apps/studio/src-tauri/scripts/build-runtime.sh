#!/usr/bin/env bash
# Build the embedded Python runtime bundled by Tauri (macOS/Linux).
# Downloads a standalone CPython into resources/python and pip-installs
# resources/runtime/requirements.txt into it. Run BEFORE `tauri build`.
set -euo pipefail

PY_VERSION="${PY_VERSION:-3.11.9}"
RELEASE="${RELEASE:-20240814}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"   # src-tauri
PY_DIR="$ROOT/resources/python"
REQ_FILE="$ROOT/resources/runtime/requirements.txt"

# python-build-standalone names ARM as `aarch64`, but `uname -m` reports `arm64`
# on Apple Silicon — normalize so the asset URL resolves.
ARCH="$(uname -m)"
[ "$ARCH" = "arm64" ] && ARCH="aarch64"

case "$(uname -s)" in
  Darwin) TRIPLE="${ARCH}-apple-darwin" ;;
  Linux)  TRIPLE="${ARCH}-unknown-linux-gnu" ;;
  *) echo "unsupported platform: $(uname -s)"; exit 1 ;;
esac

echo "==> Embedded runtime -> $PY_DIR"

if [ ! -x "$PY_DIR/bin/python3" ]; then
  ASSET="cpython-${PY_VERSION}+${RELEASE}-${TRIPLE}-install_only.tar.gz"
  URL="https://github.com/indygreg/python-build-standalone/releases/download/${RELEASE}/${ASSET}"
  TMP="$(mktemp -d)/$ASSET"
  echo "==> Downloading $URL"
  curl -fsSL "$URL" -o "$TMP"
  mkdir -p "$PY_DIR"
  # Archive unpacks to a python/ folder; flatten into resources/python.
  tar -xzf "$TMP" -C "$PY_DIR" --strip-components=1
else
  echo "==> python3 already present, skipping download"
fi

PY="$PY_DIR/bin/python3"
echo "==> Upgrading pip"
"$PY" -m pip install --upgrade pip
echo "==> Installing $REQ_FILE"
"$PY" -m pip install -r "$REQ_FILE"

echo "==> Done. Bundle with: yarn tauri build"
