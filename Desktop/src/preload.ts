import { contextBridge, ipcRenderer } from 'electron';

/**
 * The only door between the web app and the computer. The React app sees `window.desktop`;
 * it has no Node access (contextIsolation + sandbox), so it can only call what is listed here.
 */
const desktop = {
    platform: process.platform,
    notify: (notification: {
        title: string;
        body: string;
        tag?: string;
        path?: string;
    }): Promise<boolean> => ipcRenderer.invoke('desktop:notify', notification),
    /** Shows a test pop-up and says whether the OS accepted it. */
    testNotification: (): Promise<{ ok: boolean; error?: string }> =>
        ipcRenderer.invoke('desktop:notify:test'),
    /** `icon` is a PNG data URL with the number drawn in; only Windows uses it (taskbar overlay). */
    setBadge: (count: number, icon?: string): void =>
        ipcRenderer.send('desktop:badge', count, icon),
    getSettings: (): Promise<{
        autoLaunch: boolean;
        closeToTray: boolean;
        notifications: boolean;
    }> => ipcRenderer.invoke('desktop:settings:get'),
    setSettings: (
        patch: Partial<{
            autoLaunch: boolean;
            closeToTray: boolean;
            notifications: boolean;
        }>,
    ): Promise<{
        autoLaunch: boolean;
        closeToTray: boolean;
        notifications: boolean;
    }> => ipcRenderer.invoke('desktop:settings:set', patch),
    /** The state of an app update: nothing, downloading (with percent), ready to install, or failed. */
    getUpdate: (): Promise<unknown> => ipcRenderer.invoke('desktop:update:get'),
    onUpdate: (callback: (state: unknown) => void): (() => void) => {
        const listener = (_event: unknown, state: unknown) => callback(state);

        ipcRenderer.on('desktop:update', listener);

        return () => ipcRenderer.removeListener('desktop:update', listener);
    },
    /** Restart and install a downloaded update; on a failed one, try again. */
    installUpdate: (): void => ipcRenderer.send('desktop:update:install'),
    /** Called when a notification is clicked; `path` is an app route such as `/chat/12`. */
    onNavigate: (callback: (path: string) => void): (() => void) => {
        const listener = (_event: unknown, path: string) => callback(path);

        ipcRenderer.on('desktop:navigate', listener);

        return () => ipcRenderer.removeListener('desktop:navigate', listener);
    },
};

contextBridge.exposeInMainWorld('desktop', desktop);
