#!/bin/bash
set -e

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
  echo "🔧 Creating virtual environment..."
  python3 -m venv .venv
fi

# Activate virtual environment
echo "⚙️  Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run database migrations
echo "🗄️  Running database migrations..."
alembic upgrade head

# Seed the database
echo "🌱 Seeding database..."
python scripts/seed_all.py

# Start the development server
echo "🚀 Starting development server..."
uvicorn main:app --reload
