# Vailabel Studio Desktop

A cross-platform desktop application for Vision AI Label Studio built with Electron and TypeScript.

## Overview

The desktop app provides a native experience for the Vailabel Studio platform, featuring:
- Cross-platform support (Windows, macOS, Linux)
- Integrated Python AI services for YOLO object detection
- Auto-update functionality
- Native system integration

## Installation

### Dependencies

Install Node.js dependencies:
```bash
yarn install
```

### Python Configuration

Configure Python environment in `python-config.json`:
```json
{
  "venvPath": "/path/to/your/venv",
  "pythonPath": "/path/to/your/venv/bin/python3"
}
```

Install Python dependencies:
```bash
pip install -r src/ai/requirements.txt
```

## Running the App

### Development
```bash
yarn dev
```

### Build
```bash
yarn build
```

### Release
```bash
yarn release
```

## Key Files

- `src/main.ts` - Main Electron process
- `electron-builder.yml` - Build configuration
- `python-config.json` - Python environment setup
- `package.json` - Node.js dependencies and scripts

## Build Targets

- **Windows**: NSIS installer, portable executable
- **macOS**: DMG installer
- **Linux**: AppImage, DEB package