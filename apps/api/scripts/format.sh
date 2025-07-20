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

# Run formatter
echo "🛠️  Formatting code..."
black .
# Check if formatting was successful
if [ $? -eq 0 ]; then
  echo "✅ Code formatted successfully."
else
  echo "❌ Formatting failed. Please check the output above."
  exit 1
fi  
