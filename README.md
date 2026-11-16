# SS Manager: desktop app

Installers for the SS Manager desktop app (macOS, Windows, Linux). Download the latest from [Releases](../../releases/latest).

| System | File |
|---|---|
| Windows | `SS-Manager-Setup-<version>.exe` |
| macOS, Apple Silicon (M1 and newer) | `SS-Manager-<version>-arm64.dmg` |
| macOS, Intel | `SS-Manager-<version>.dmg` |
| Linux, Ubuntu / Debian | `ss-manager-desktop_<version>_amd64.deb`, then `sudo apt install ./ss-manager-desktop_<version>_amd64.deb` |
| Linux, other | `SS-Manager-<version>.AppImage`, then `chmod +x` and run it (needs `libfuse2`) |

The app is not code-signed yet, so the first start shows a warning:

- **Windows:** "Windows protected your PC" → More info → Run anyway.
- **macOS:** right-click the app → Open → Open.

The app keeps running in the system tray so you still get message notifications when the window is closed. Installed apps update themselves from this page.
