import { app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Argument the launcher adds, so the app knows it started with the computer and stays hidden. */
export const HIDDEN_FLAG = '--hidden';

const linuxEntry = () => path.join(os.homedir(), '.config', 'autostart', 'ss-manager.desktop');

/**
 * Electron's login item API covers macOS and Windows only. On Linux the app writes a freedesktop
 * autostart entry (works on GNOME, KDE, XFCE, ...).
 */
export function applyAutoLaunch(enabled: boolean): void {
    if (!app.isPackaged) {
        return;
    }

    if (process.platform === 'linux') {
        try {
            if (!enabled) {
                fs.rmSync(linuxEntry(), { force: true });

                return;
            }

            // AppImage: the real executable is APPIMAGE, process.execPath points into a temporary mount.
            const exec = process.env.APPIMAGE ?? process.execPath;

            fs.mkdirSync(path.dirname(linuxEntry()), { recursive: true });
            fs.writeFileSync(
                linuxEntry(),
                [
                    '[Desktop Entry]',
                    'Type=Application',
                    'Name=SS Manager',
                    `Exec="${exec}" ${HIDDEN_FLAG}`,
                    'X-GNOME-Autostart-enabled=true',
                    '',
                ].join('\n'),
            );
        } catch {
            // no write access to ~/.config: skip
        }

        return;
    }

    app.setLoginItemSettings({
        openAtLogin: enabled,
        args: enabled ? [HIDDEN_FLAG] : [],
    });
}
