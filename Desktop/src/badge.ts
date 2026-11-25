import { app, nativeImage, type BrowserWindow, type NativeImage } from 'electron';

/** A red dot as raw BGRA pixels, so no image file or canvas is needed. Used as the Windows taskbar overlay. */
function dot(): NativeImage {
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    const centre = (size - 1) / 2;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const inside = Math.hypot(x - centre, y - centre) <= size / 2 - 1;
            const at = (y * size + x) * 4;

            buffer[at] = 0x2d; // B
            buffer[at + 1] = 0x3a; // G
            buffer[at + 2] = 0xe5; // R
            buffer[at + 3] = inside ? 0xff : 0x00;
        }
    }

    return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

/**
 * Shows the unread count outside the window: the dock badge on macOS, the launcher count on Linux
 * (Unity / KDE), a red overlay with the number on the taskbar button on Windows (the taskbar
 * button only exists while the window is visible).
 */
export function setBadge(window: BrowserWindow | null, count: number, overlay?: NativeImage): void {
    const total = Math.max(0, Math.floor(count));

    app.setBadgeCount(total);

    if (process.platform === 'win32' && window) {
        // The web app draws the number into the icon; the plain dot is the fallback.
        window.setOverlayIcon(total > 0 ? (overlay ?? dot()) : null, total > 0 ? `${total} unread` : '');
    }
}
