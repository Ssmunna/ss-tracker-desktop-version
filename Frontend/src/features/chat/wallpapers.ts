/** Chat wallpapers. The look of each id is CSS in styles/globals.css (`.chat-wall-<id>`). */
export const WALLPAPERS = [
    { id: 'peach', label: 'Peach' },
    { id: 'white', label: 'White' },
    { id: 'sand', label: 'Sand' },
    { id: 'mint', label: 'Mint' },
    { id: 'sky', label: 'Sky' },
    { id: 'lavender', label: 'Lavender' },
    { id: 'blush', label: 'Blush' },
    { id: 'sunset', label: 'Sunset' },
    { id: 'slate', label: 'Slate' },
    { id: 'paper', label: 'Paper' },
] as const;

export type WallpaperId = (typeof WALLPAPERS)[number]['id'];

export const DEFAULT_WALLPAPER: WallpaperId = 'peach';

export function isWallpaperId(value: unknown): value is WallpaperId {
    return WALLPAPERS.some((wallpaper) => wallpaper.id === value);
}

export const wallpaperClass = (id: WallpaperId) => `chat-wall chat-wall-${id}`;
