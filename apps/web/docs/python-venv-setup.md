---
title: Setting Up a Python Virtual Environment
description: Learn how to set up a Python virtual environment (venv) for your projects.
category: Development
tags: [python, venv, development]
lastUpdated: May 20, 2025
---

## 1. Install Python (Latest Version)

Download and install the latest version of Python from the [official Python website](https://www.python.org/downloads/).

- Ensure you check the option to add Python to your PATH during installation.
- After installation, verify Python is installed by running:

```sh
python3 --version
```

## 2. Install venv Module (if needed)

The `venv` module is included by default in Python 3.3 and above. If you encounter an error, install it using:

**On macOS/Linux:**

```sh
python3 -m ensurepip --upgrade
```

**On Ubuntu/Debian:**

```sh
sudo apt-get install python3-venv
```

## 3. Create a Virtual Environment

Open your terminal and navigate to directory that you want to create your virtual environment in. Then run the following command:

```sh
python3 -m venv .venv
```

- This creates a `.venv` folder in your project directory containing the isolated Python environment.

## 4. Attach the Virtual Environment to Your Application

Instead of activating the virtual environment in your terminal, configure your application or code editor to use the Python interpreter from the `.venv` folder:

- In Vision AI Label Studio: Go to **Settings** ⚙️ → **Python Setup** tab, then browse and select the Python interpreter from your `.venv` folder (e.g., `.venv` on macOS/Linux or `.venv` on Windows).

This ensures your application uses the packages and environment from your virtual environment without manual activation.

## Conclusion

You've successfully set up a Python virtual environment! This isolated environment allows you to manage dependencies and Python versions for different projects separately.
