<#
.SYNOPSIS
  Build the embedded Python runtime bundled by Tauri (Windows).

.DESCRIPTION
  Downloads a standalone CPython (python-build-standalone) into
  resources/python and pip-installs resources/runtime/requirements.txt into it.
  Run this BEFORE `tauri build`. Re-run to refresh deps.

.PARAMETER PyVersion
  CPython version tag to fetch (default 3.11.x standalone release).
#>
param(
  [string]$PyVersion = "3.11.9",
  [string]$Release   = "20240814"
)

$ErrorActionPreference = "Stop"
$root      = Split-Path -Parent $PSScriptRoot         # src-tauri
$pyDir     = Join-Path $root "resources\python"
$reqFile   = Join-Path $root "resources\runtime\requirements.txt"

Write-Host "==> Embedded runtime → $pyDir"

# 1. Fetch standalone CPython (CPU). Adjust the asset name if you change versions.
$asset = "cpython-$PyVersion+$Release-x86_64-pc-windows-msvc-install_only.tar.gz"
$url   = "https://github.com/indygreg/python-build-standalone/releases/download/$Release/$asset"
$tmp   = Join-Path $env:TEMP $asset

if (-not (Test-Path (Join-Path $pyDir "python.exe"))) {
  Write-Host "==> Downloading $url"
  Invoke-WebRequest -Uri $url -OutFile $tmp
  New-Item -ItemType Directory -Force -Path $pyDir | Out-Null
  # The archive unpacks to a `python/` folder; flatten it into resources/python.
  tar -xzf $tmp -C $pyDir --strip-components=1
} else {
  Write-Host "==> python.exe already present, skipping download"
}

# 2. Install runtime dependencies into the embedded interpreter.
$py = Join-Path $pyDir "python.exe"
Write-Host "==> Upgrading pip"
& $py -m pip install --upgrade pip
Write-Host "==> Installing $reqFile"
& $py -m pip install -r $reqFile

Write-Host "==> Done. Bundle with: yarn tauri build"
