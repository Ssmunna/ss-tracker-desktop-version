import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface DesktopSettings {
    /** Start with the computer, hidden in the tray, so messages arrive without opening the app. */
    autoLaunch: boolean;
    /** The window close button hides to the tray instead of quitting. */
    closeToTray: boolean;
    /** Show native notifications for new messages. */
    notifications: boolean;
}

const defaults: DesktopSettings = {
    autoLaunch: true,
    closeToTray: true,
    notifications: true,
};

const file = () => path.join(app.getPath('userData'), 'settings.json');

let cache: DesktopSettings | null = null;

export function getSettings(): DesktopSettings {
    if (cache) {
        return cache;
    }

    try {
        const stored = JSON.parse(fs.readFileSync(file(), 'utf8')) as Partial<DesktopSettings>;

        cache = {
            autoLaunch: stored.autoLaunch ?? defaults.autoLaunch,
            closeToTray: stored.closeToTray ?? defaults.closeToTray,
            notifications: stored.notifications ?? defaults.notifications,
        };
    } catch {
        cache = { ...defaults };
    }

    return cache;
}

export function saveSettings(patch: Partial<DesktopSettings>): DesktopSettings {
    const current = getSettings();
    const next: DesktopSettings = {
        autoLaunch: typeof patch.autoLaunch === 'boolean' ? patch.autoLaunch : current.autoLaunch,
        closeToTray: typeof patch.closeToTray === 'boolean' ? patch.closeToTray : current.closeToTray,
        notifications: typeof patch.notifications === 'boolean' ? patch.notifications : current.notifications,
    };

    cache = next;

    try {
        fs.writeFileSync(file(), JSON.stringify(next, null, 2));
    } catch {
        // read-only profile: settings last until the app quits
    }

    return next;
}
