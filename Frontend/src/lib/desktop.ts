export interface DesktopSettings {
    autoLaunch: boolean;
    closeToTray: boolean;
    notifications: boolean;
}

/** The state of an app update, as the desktop shell reports it. */
export type UpdateState =
    | { status: 'idle' }
    | { status: 'downloading'; version: string; percent: number }
    | { status: 'ready'; version: string }
    | { status: 'available'; version: string }
    | { status: 'error'; version: string; message: string };

/** What the Electron shell (`Desktop/src/preload.ts`) exposes. Missing in a normal browser. */
export interface DesktopBridge {
    platform: string;
    notify: (notification: {
        title: string;
        body: string;
        tag?: string;
        path?: string;
    }) => Promise<boolean>;
    testNotification: () => Promise<{ ok: boolean; error?: string }>;
    setBadge: (count: number, icon?: string) => void;
    getSettings: () => Promise<DesktopSettings>;
    setSettings: (patch: Partial<DesktopSettings>) => Promise<DesktopSettings>;
    onNavigate: (callback: (path: string) => void) => () => void;
    getUpdate: () => Promise<UpdateState>;
    onUpdate: (callback: (state: UpdateState) => void) => () => void;
    installUpdate: () => void;
}

declare global {
    interface Window {
        desktop?: DesktopBridge;
    }
}

/** The desktop bridge, or null when the app runs in a browser. */
export function getDesktop(): DesktopBridge | null {
    return typeof window !== 'undefined' ? (window.desktop ?? null) : null;
}
