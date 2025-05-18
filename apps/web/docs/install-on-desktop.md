---
title: Installing on Desktop (Windows & macOS)
description: Learn how to install Vision AI Label Studio on Windows and macOS, including troubleshooting unsigned app issues.
category: Issues
tags: [setup, installation, desktop]
lastUpdated: May 18, 2025
---

# Installing on Desktop (Windows & macOS)

Welcome to Vision AI Label Studio! This guide will help you install the application on your Windows or macOS desktop and troubleshoot any issues related to unsigned app warnings.

## Unsigned App Warning

When installing Vision AI Label Studio, you might encounter warnings about the app being from an unidentified developer or not being signed. Follow the appropriate section below for your operating system to proceed safely.

### Windows: Unsigned App Warning

When running the installer, Windows may display a warning such as:

> Windows protected your PC

This happens because the app is not signed with a certificate. To continue:

1. Click **More info** on the warning dialog.
2. Click **Run anyway** to proceed with the installation.

**Note:** Only do this if you downloaded the installer from the official Vision AI Label Studio website or a trusted source.

### macOS: Unidentified Developer

On macOS, you may see a message like:

> "Vision AI Label Studio" can’t be opened because it is from an unidentified developer.

To bypass this:

1. Open **System Preferences** > **Security & Privacy** > **General**.
2. You will see a message about the blocked app. Click **Open Anyway**.
3. Confirm in the dialog that appears.

Alternatively, you can right-click the app and select **Open**, then confirm.

Alternatively, if you are on macOS and the app still won't open, you can try removing the quarantine attribute by running this command in your terminal:

```bash
xattr -c /Applications/Vision\ AI\ Label\ Studio.app
```

> **Warning:** This command removes all extended attributes (such as the 'quarantine' flag) from the application, which macOS may set when you download an app from the internet. Removing these attributes can help resolve issues where the app won't launch due to security restrictions. However, it will remove all extended attributes, not just the quarantine flag, and may bypass some of macOS's built-in security protections. Only use this if you trust the source of the application.

**Warning:** Only bypass this warning if you trust the source of the application.

## ⚠️ Seeking Contributors with Signing Credentials

> **Attention:**
>
> To improve the installation experience and remove unsigned app warnings, we are looking for contributors who have:
>
> - An **Apple Developer account** (for macOS app signing)
> - A **Microsoft code signing key** (for Windows app signing)
>
> If you have access to either of these and are willing to help sign future releases, please reach out or open an issue on our GitHub repository. Your contribution will help make Vision AI Label Studio safer and easier to install for everyone!
