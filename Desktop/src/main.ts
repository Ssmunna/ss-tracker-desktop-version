import {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    nativeImage,
    net,
    Notification,
    protocol,
    session,
    shell,
    systemPreferences,
    Tray,
    type WebContents,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { applyAutoLaunch, HIDDEN_FLAG } from './autostart';
import { setBadge } from './badge';
import { getSettings, saveSettings } from './settings';

const APP_ID = 'com.thesecondsource.ssmanager';
const SCHEME = 'app';
const ORIGIN = `${SCHEME}://app`;
// `npm run dev` points this at the Vite server; a packaged app serves the built files itself.
const DEV_URL = process.env.DESKTOP_DEV_URL;
const startHidden = process.argv.includes(HIDDEN_FLAG);

// A privileged scheme gives the app a stable, secure origin (`app://app`), so path routing,
// fetch and websockets behave like on a normal https site.
protocol.registerSchemesAsPrivileged([
    {
        scheme: SCHEME,
        privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
]);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let unread = 0;
const shown = new Map<string, Notification>();

const iconPath = () =>
    app.isPackaged
        ? path.join(process.resourcesPath, 'icon.png')
        : path.join(__dirname, '..', 'build', 'icon.png');

const webRoot = () =>
    app.isPackaged
        ? path.join(process.resourcesPath, 'web')
        : path.join(__dirname, '..', '..', 'Frontend', 'dist');

const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    // The API, Reverb and storage hosts are chosen at build time, so any https/wss host is allowed.
    "connect-src 'self' https: wss:",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
].join('; ');

function serveApp(): void {
    const root = webRoot();

    protocol.handle(SCHEME, async (request) => {
        const url = new URL(request.url);
        let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));

        if (!file.startsWith(root)) {
            return new Response('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            // A missing file with an extension is a real 404; anything else is a route inside the SPA.
            if (path.extname(url.pathname)) {
                return new Response('Not found', { status: 404 });
            }

            file = path.join(root, 'index.html');
        }

        const response = await net.fetch(pathToFileURL(file).toString());
        const headers = new Headers(response.headers);

        headers.set('Content-Security-Policy', csp);

        return new Response(response.body, { status: response.status, headers });
    });
}

function showWindow(): void {
    if (!mainWindow) {
        createWindow();

        return;
    }

    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
}

const isAppUrl = (url: string) => url.startsWith(ORIGIN) || Boolean(DEV_URL && url.startsWith(DEV_URL));

/**
 * Rules for every window of the app, the main one and the extra ones opened from it (for example
 * "Open in new window" on a chat): a page of the app opens as another app window, a link to any
 * other site opens in the system browser, and no window can navigate away from the app.
 */
function guard(contents: WebContents): void {
    contents.setWindowOpenHandler(({ url }) => {
        if (isAppUrl(url)) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    width: 1100,
                    height: 780,
                    minWidth: 420,
                    minHeight: 600,
                    title: 'SS Manager',
                    backgroundColor: '#ffffff',
                    icon: iconPath(),
                    autoHideMenuBar: true,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload.js'),
                        contextIsolation: true,
                        nodeIntegration: false,
                        sandbox: true,
                    },
                },
            };
        }

        if (/^https?:\/\//i.test(url)) {
            void shell.openExternal(url);
        }

        return { action: 'deny' };
    });
    contents.on('did-create-window', (child) => guard(child.webContents));
    contents.on('will-navigate', (event, url) => {
        if (!isAppUrl(url)) {
            event.preventDefault();

            if (/^https?:\/\//i.test(url)) {
                void shell.openExternal(url);
            }
        }
    });
}

function createWindow(): void {
    const window = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 420,
        minHeight: 600,
        show: false,
        title: 'SS Manager',
        backgroundColor: '#ffffff',
        icon: iconPath(),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            // A hidden window must keep its websocket and timers running, or messages stop arriving.
            backgroundThrottling: false,
        },
    });

    mainWindow = window;
    window.once('ready-to-show', () => {
        // Started by the login item: stay in the tray until the person opens the app or a message arrives.
        if (!startHidden) {
            window.show();
        }
    });

    window.on('close', (event) => {
        if (quitting) {
            return;
        }

        if (getSettings().closeToTray) {
            event.preventDefault();
            window.hide();
        } else {
            quitting = true;
        }
    });
    window.on('closed', () => {
        mainWindow = null;
    });

    guard(window.webContents);

    void window.loadURL(DEV_URL ?? `${ORIGIN}/`);
}

function createTray(): void {
    const image = nativeImage.createFromPath(iconPath()).resize({ width: 22, height: 22 });

    tray = new Tray(image);
    tray.setToolTip('SS Manager');
    tray.setContextMenu(
        Menu.buildFromTemplate([
            { label: 'Open SS Manager', click: showWindow },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    quitting = true;
                    app.quit();
                },
            },
        ]),
    );
    // On Windows and most Linux desktops a click opens the app (the menu is on right click).
    tray.on('click', showWindow);
}

/** Web text comes from other people, so every field is checked before it reaches the OS. */
function cleanText(value: unknown, max: number): string {
    return typeof value === 'string' ? value.slice(0, max) : '';
}

function safePath(value: unknown): string | null {
    return typeof value === 'string' && /^\/(?!\/)[^\s]*$/.test(value) ? value : null;
}

/**
 * Shows a pop-up and waits for the OS to say yes or no. On macOS this is also what makes the app
 * appear in System Settings > Notifications and triggers the permission prompt.
 */
function showTest(): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
        if (!Notification.isSupported()) {
            resolve({ ok: false, error: 'Notifications are not supported on this system.' });

            return;
        }

        const notification = new Notification({
            title: 'SS Manager',
            body: 'Notifications are working.',
            icon: iconPath(),
        });
        const timer = setTimeout(() => resolve({ ok: true }), 4000);

        notification.on('show', () => {
            clearTimeout(timer);
            resolve({ ok: true });
        });
        notification.on('failed', (_event, error) => {
            clearTimeout(timer);
            resolve({ ok: false, error: String(error) });
        });
        notification.show();
    });
}

/** First start on macOS: register with the Notification Center so the permission prompt appears. */
async function introduceToMac(): Promise<void> {
    const marker = path.join(app.getPath('userData'), 'notifications-registered');

    if (process.platform !== 'darwin' || fs.existsSync(marker)) {
        return;
    }

    await showTest();

    try {
        fs.writeFileSync(marker, '1');
    } catch {
        // read-only profile: it simply asks again next start
    }
}

function registerIpc(): void {
    ipcMain.handle('desktop:notify:test', (event) =>
        event.sender === mainWindow?.webContents ? showTest() : { ok: false },
    );

    ipcMain.handle('desktop:notify', (event, payload: unknown) => {
        if (event.sender !== mainWindow?.webContents || !getSettings().notifications) {
            return false;
        }

        const data = (payload ?? {}) as Record<string, unknown>;
        const title = cleanText(data.title, 120) || 'SS Manager';
        const body = cleanText(data.body, 300);
        const tag = cleanText(data.tag, 80);
        const target = safePath(data.path);

        // Whether the person is already looking at this update is decided by the web app
        // (it knows the open page); here only the OS side is handled.
        // Only the main window talks to the OS, but the person may be reading this very chat in an
        // extra window ("Open in new window"); the main window, unfocused, would otherwise pop up.
        const reading = BrowserWindow.getFocusedWindow();

        if (target && reading && reading !== mainWindow && new URL(reading.webContents.getURL()).pathname === target) {
            return false;
        }

        if (!Notification.isSupported()) {
            return false;
        }

        // One notification per chat: a newer message replaces the older one.
        if (tag) {
            shown.get(tag)?.close();
        }

        const notification = new Notification({ title, body, icon: iconPath() });

        notification.on('click', () => {
            showWindow();

            if (target) {
                mainWindow?.webContents.send('desktop:navigate', target);
            }
        });
        notification.on('failed', (_event, error) => {
            // macOS drops these silently when the app is not signed or notifications are off for it.
            console.error('notification failed:', error);
        });
        notification.on('close', () => {
            if (tag && shown.get(tag) === notification) {
                shown.delete(tag);
            }
        });

        if (tag) {
            shown.set(tag, notification);
        }

        notification.show();

        return true;
    });

    ipcMain.on('desktop:badge', (event, count: unknown, icon: unknown) => {
        if (event.sender !== mainWindow?.webContents) {
            return;
        }

        unread = typeof count === 'number' && Number.isFinite(count) ? count : 0;
        // Only a small PNG data URL is accepted; anything else falls back to the plain dot.
        const overlay =
            typeof icon === 'string' && icon.startsWith('data:image/png;base64,') && icon.length < 20_000
                ? nativeImage.createFromDataURL(icon)
                : undefined;

        setBadge(mainWindow, unread, overlay);
        tray?.setToolTip(unread > 0 ? `SS Manager (${unread} unread)` : 'SS Manager');
    });

    ipcMain.handle('desktop:update:get', () => updateState);
    ipcMain.on('desktop:update:install', (event) => {
        if (event.sender !== mainWindow?.webContents) {
            return;
        }

        if (updateState.status === 'ready') {
            installUpdate();
        } else if (updateState.status === 'available') {
            void shell.openExternal(RELEASES_URL);
        } else if (updateState.status === 'error') {
            // Try again: the check finds the update and downloads it anew.
            void autoUpdater.checkForUpdates().catch(() => undefined);
        }
    });
    ipcMain.handle('desktop:settings:get', () => getSettings());
    ipcMain.handle('desktop:settings:set', (_event, patch: unknown) => {
        const next = saveSettings((patch ?? {}) as Record<string, boolean>);

        applyAutoLaunch(next.autoLaunch);

        return next;
    });
}

function setupPermissions(): void {
    // The voice recorder needs the microphone and the app shows notifications; nothing else is granted.
    const allowed = new Set(['media', 'notifications', 'clipboard-sanitized-write']);

    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) =>
        callback(allowed.has(permission)),
    );
    session.defaultSession.setPermissionCheckHandler((_contents, permission) => allowed.has(permission));
}

/**
 * The API only lists the websites in its `FRONTEND_URL`, and the desktop app's own origin is not one
 * of them. The API takes a bearer token (no cookies), so the app answers the browser's CORS check
 * for its own window here instead of needing a server change. Only the app window is affected.
 */
/** A finished download says so, and a click shows the file in its folder. */
function setupDownloads(): void {
    session.defaultSession.on('will-download', (_event, item) => {
        item.once('done', (_done, state) => {
            if (state !== 'completed') {
                return;
            }

            const file = item.getSavePath();

            popUp('Download complete', item.getFilename(), () => shell.showItemInFolder(file));
        });
    });
}

function setupCors(): void {
    const allowedHeaders = 'Authorization, Content-Type, Accept, X-Requested-With';

    session.defaultSession.webRequest.onHeadersReceived(
        { urls: ['https://*/*', 'http://*/*'] },
        (details, callback) => {
            if (details.webContentsId !== mainWindow?.webContents.id) {
                callback({});

                return;
            }

            const headers: Record<string, string | string[]> = {};

            for (const [name, value] of Object.entries(details.responseHeaders ?? {})) {
                if (!/^access-control-/i.test(name)) {
                    headers[name] = value;
                }
            }

            headers['Access-Control-Allow-Origin'] = ORIGIN;
            headers['Access-Control-Allow-Methods'] = '*';
            headers['Access-Control-Allow-Headers'] = allowedHeaders;
            headers['Access-Control-Expose-Headers'] = 'Content-Disposition, Retry-After';

            callback({ responseHeaders: headers });
        },
    );
}

const RELEASES_URL = 'https://github.com/Ssmunna/ss-tracker-desktop-version/releases/latest';
// The app asks the (public) release page itself; nothing is pushed to it. Twice a day, plus at start.
const UPDATE_CHECK_MS = 12 * 60 * 60 * 1000;

function popUp(title: string, body: string, onClick: () => void): void {
    if (!Notification.isSupported()) {
        return;
    }

    const notification = new Notification({ title, body, icon: iconPath() });

    notification.on('click', onClick);
    notification.show();
}

type UpdateState =
    | { status: 'idle' }
    | { status: 'downloading'; version: string; percent: number }
    | { status: 'ready'; version: string }
    | { status: 'available'; version: string }
    | { status: 'error'; version: string; message: string };

let updateState: UpdateState = { status: 'idle' };

/** The web app shows this as a banner (download progress, restart button), so it needs every change. */
function setUpdate(next: UpdateState): void {
    updateState = next;
    mainWindow?.webContents.send('desktop:update', next);
}

function installUpdate(): void {
    quitting = true;
    // Second argument: start the app again once the update is in (needed for the .deb).
    autoUpdater.quitAndInstall(false, true);
}

/**
 * Windows, the Linux AppImage and the Linux .deb download the update in the background; "Restart and
 * update" then installs it (a .deb asks for the password in a system dialog) and starts the app again.
 * macOS cannot replace an app that has no Apple Developer ID signature, so there the person is told
 * and the release page opens for a manual download.
 */
function checkForUpdates(): void {
    if (!app.isPackaged) {
        return;
    }

    const manual = process.platform === 'darwin';
    const debPackage = process.platform === 'linux' && !process.env.APPIMAGE;

    autoUpdater.autoDownload = !manual;
    // A .deb install needs the password, so it only happens when the person asks, never as a surprise on quit.
    autoUpdater.autoInstallOnAppQuit = !manual && !debPackage;
    autoUpdater.on('error', (error) => {
        // Offline or no release yet is silent: it is tried again at the next interval. A failure after an
        // update was found (download broke, password dialog cancelled) is shown.
        if (updateState.status === 'downloading' || updateState.status === 'ready') {
            quitting = false;
            setUpdate({
                status: 'error',
                version: 'version' in updateState ? updateState.version : '',
                message: error.message.split('\n')[0].slice(0, 200),
            });
        }
    });
    // The manual path would repeat the same pop-up every 12 hours; say it once per version.
    let announced = '';

    autoUpdater.on('update-available', (info) => {
        if (!manual) {
            // A later check finds the same update again; it is already downloaded.
            if (updateState.status === 'ready' && updateState.version === info.version) {
                return;
            }

            setUpdate({ status: 'downloading', version: info.version, percent: 0 });

            return;
        }

        setUpdate({ status: 'available', version: info.version });

        if (info.version !== announced) {
            announced = info.version;
            popUp('Update available', `SS Manager ${info.version} is ready to download. Click to open the download page.`, () => {
                void shell.openExternal(RELEASES_URL);
            });
        }
    });
    autoUpdater.on('download-progress', (progress) => {
        if (updateState.status === 'downloading') {
            setUpdate({ ...updateState, percent: Math.round(progress.percent) });
        }
    });
    autoUpdater.on('update-downloaded', (info) => {
        setUpdate({ status: 'ready', version: info.version });
        popUp('Update ready', `SS Manager ${info.version} is downloaded. Click to restart and update.`, installUpdate);
    });

    const check = () => void autoUpdater.checkForUpdates().catch(() => undefined);

    check();
    setInterval(check, UPDATE_CHECK_MS);
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', showWindow);

    app.whenReady().then(async () => {
        app.setAppUserModelId(APP_ID);

        if (process.platform === 'darwin') {
            // Ask once, up front, so the first voice message does not fail silently.
            void systemPreferences.askForMediaAccess('microphone').catch(() => undefined);
        }

        if (!DEV_URL) {
            serveApp();
        }

        setupPermissions();
        setupCors();
        setupDownloads();
        registerIpc();
        createTray();
        createWindow();
        void introduceToMac();
        applyAutoLaunch(getSettings().autoLaunch);
        checkForUpdates();

        app.on('activate', showWindow);
    });

    app.on('before-quit', () => {
        quitting = true;
    });

    // Closing every window must not quit: the tray keeps the connection alive for notifications.
    app.on('window-all-closed', () => {
        if (quitting) {
            app.quit();
        }
    });
}
