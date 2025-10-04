# Desktop App Setup Guide

This guide will help you set up and run the Vailabel Studio Desktop application on your local machine.

## Prerequisites

Before getting started, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **Yarn** package manager
- **Python** (v3.8 or higher)
- **Git**

## 🐍 Python Environment Setup

The desktop app uses Python for AI functionality (YOLO object detection). You'll need to set up a Python virtual environment with the required dependencies.

### 1. Create a Python Virtual Environment

```bash
# Navigate to the desktop app directory
cd apps/desktop

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Python Dependencies

The Python dependencies are listed in `src/ai/requirements.txt`:

```txt
ultralytics
opencv-python
Pillow
```

Install them using pip:

```bash
pip install -r src/ai/requirements.txt
```

### 3. Configure Python Path

Update the `python-config.json` file with your virtual environment paths:

```json
{
  "venvPath": "/path/to/your/venv",
  "pythonPath": "/path/to/your/venv/bin/python3"
}
```

**Example for Windows:**
```json
{
  "venvPath": "C:\\path\\to\\project\\apps\\desktop\\venv",
  "pythonPath": "C:\\path\\to\\project\\apps\\desktop\\venv\\Scripts\\python.exe"
}
```

## 📦 Installing Dependencies

### 1. Install Node.js Dependencies

From the desktop app directory:

```bash
# Install all dependencies
yarn install
```

### 2. Verify Installation

Check if all dependencies are installed correctly:

```bash
# Run type checking
yarn typecheck

# Run tests (optional)
yarn test
```

## 🚀 Running the Application

### Development Mode

For development with hot-reload and debugging:

```bash
# Make sure your Python virtual environment is activated
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Run in development mode
yarn dev
```

This will:
- Copy Python files to the dist directory
- Copy HTML files
- Compile TypeScript
- Launch Electron with development settings

### Production Build

To create a production build:

```bash
# Build the application
yarn build
```

This creates an optimized build in the `dist` directory and packages it using Electron Builder.

### Release Build

To create a release with auto-updater:

```bash
# Create a release build
yarn release
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Run in development mode |
| `yarn build` | Create production build |
| `yarn release` | Create release build with auto-updater |
| `yarn test` | Run tests with coverage |
| `yarn format` | Format code with Prettier |
| `yarn typecheck` | Run TypeScript type checking |

## 🐛 Troubleshooting

### Common Issues

1. **Python not found**: Make sure Python is installed and the path in `python-config.json` is correct.

2. **Dependencies not installing**: Try deleting `node_modules` and running `yarn install` again.

3. **Electron not starting**: Check if all dependencies are installed and try running `yarn typecheck` first.

4. **AI functionality not working**: Ensure your Python virtual environment is activated and all Python dependencies are installed.

### Debug Mode

Run with debug information:

```bash
yarn dev --trace-warnings --no-sandbox
```

## 📁 Project Structure

```
apps/desktop/
├── src/
│   ├── ai/                 # Python AI scripts
│   │   ├── requirements.txt
│   │   └── yolo.py
│   ├── main.ts            # Main Electron process
│   ├── preload.ts         # Preload script
│   └── services/          # Application services
├── assets/                # Application assets
├── dist/                  # Built files
├── docs/                  # Documentation
└── package.json           # Dependencies and scripts
```

## 🔒 Security

The desktop app uses Electron's security best practices:
- Context isolation enabled
- Node integration disabled in renderer
- Secure preload scripts

---

Need help? Check the main [README](../../../README.md) or open an issue on GitHub.