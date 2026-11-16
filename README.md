# Developer Report: desktop app

Installers for the Developer Report desktop app (macOS, Windows, Linux). Download the latest from [Releases](../../releases/latest).

| System | File |
|---|---|
| Windows | `Developer-Report-Setup-<version>.exe` |
| macOS, Apple Silicon (M1 and newer) | `Developer-Report-<version>-arm64.dmg` |
| macOS, Intel | `Developer-Report-<version>.dmg` |
| Linux, Ubuntu / Debian | `developer-report-desktop_<version>_amd64.deb`, then `sudo apt install ./developer-report-desktop_<version>_amd64.deb` |
| Linux, other | `Developer-Report-<version>.AppImage`, then `chmod +x` and run it (needs `libfuse2`) |

The app is not code-signed yet, so the first start shows a warning:

- **Windows:** "Windows protected your PC" → More info → Run anyway.
- **macOS:** right-click the app → Open → Open.

The app keeps running in the system tray so you still get message notifications when the window is closed. Installed apps update themselves from this page.
