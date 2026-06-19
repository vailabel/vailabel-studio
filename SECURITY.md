# Security Policy

## Supported Versions

VaiLabel Studio follows a rolling-release model: security fixes land in the
latest release, and the desktop app ships an auto-updater that keeps installed
clients on the most recent version. We recommend always running the latest
release.

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | :white_check_mark: |
| < 2.2   | :x:                |

Older versions no longer receive security updates. If you are on a release
below 2.2, please update to the latest version (the desktop app updates itself
automatically, or download the newest build from the
[Releases page](https://github.com/vailabel/vailabel-studio/releases)).

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
pull requests, or discussions.** Public disclosure before a fix is available
puts users at risk.

Instead, report privately through either of these channels:

- **GitHub Security Advisories (preferred):** Open a private report at
  [github.com/vailabel/vailabel-studio/security/advisories/new](https://github.com/vailabel/vailabel-studio/security/advisories/new).
  This keeps the discussion private and lets us collaborate on a fix and
  coordinated disclosure in one place.
- **Email:** If you prefer email or cannot use GitHub, contact
  **nathvichea1@gmail.com** with the details below.

### What to include

To help us triage quickly, please include as much of the following as you can:

- A description of the vulnerability and its potential impact.
- The affected version(s), platform (Windows/macOS/Linux), and component
  (e.g. the desktop app, the Tauri/Rust backend, the web app, or a bundled
  dependency).
- Step-by-step instructions to reproduce the issue, including any
  proof-of-concept code, configuration, or sample data.
- Any suggested remediation, if you have one.

### What to expect

- **Acknowledgement:** We aim to confirm receipt of your report within
  **3 business days**.
- **Assessment:** We will investigate, validate the issue, and respond with an
  initial assessment (including whether we accept the report and a rough
  severity) within **7 business days**.
- **Resolution:** For accepted reports, we will work on a fix and keep you
  updated on progress. Remediation timelines depend on severity and complexity,
  but we prioritize security fixes and target a patched release as soon as is
  practical.
- **Disclosure:** We follow coordinated disclosure. Once a fix is released we
  will publish an advisory and, unless you prefer to remain anonymous, credit
  you for the discovery.
- **If declined:** If we determine the report is not a security issue (for
  example, expected behavior or out of scope), we will explain our reasoning so
  you can follow up if you disagree.

Thank you for helping keep VaiLabel Studio and its users safe.
