/**
 * A red circle with the unread number, as a PNG data URL, for the Windows taskbar overlay
 * (Windows has no count badge of its own). Null when the canvas is not available.
 */
export function badgeIcon(count: number): string | null {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;

    const context = canvas.getContext('2d');

    if (!context) {
        return null;
    }

    const label = count > 99 ? '99+' : String(count);

    context.fillStyle = 'rgb(229, 58, 45)';
    context.beginPath();
    context.arc(16, 16, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgb(255, 255, 255)';
    context.font = `bold ${label.length === 1 ? 22 : label.length === 2 ? 19 : 14}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, 16, 17);

    return canvas.toDataURL('image/png');
}
