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
pyright .
echo "✅ All type checks passed successfully."
# Check if type checks were successful
if [ $? -eq 0 ]; then
  echo "✅ Type checks passed successfully."
else
  echo "❌ Type checks failed. Please check the output above."
  exit 1
fi
