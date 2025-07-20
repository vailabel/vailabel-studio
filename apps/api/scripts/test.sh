#!/bin/bash
set -e

# Create virtual environment if not already present
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

# Activate venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest --disable-warnings --maxfail=1
