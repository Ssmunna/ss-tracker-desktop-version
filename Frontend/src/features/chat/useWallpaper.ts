import { useCallback, useSyncExternalStore } from 'react';

import { readStorage, writeStorage } from '@/lib/storage';

import {
    DEFAULT_WALLPAPER,
    isWallpaperId,
    type WallpaperId,
} from './wallpapers';

const key = (userId: number) => `dr.chat.wallpaper.${userId}`;
const listeners = new Set<() => void>();
// Used when the browser blocks storage, so the choice still works until the app closes.
const memory = new Map<number, string>();

const subscribe = (callback: () => void) => {
    listeners.add(callback);
    window.addEventListener('storage', callback);

    return () => {
        listeners.delete(callback);
        window.removeEventListener('storage', callback);
    };
};

/**
 * The chat wallpaper of this person on this device (the default one until they pick another).
 * Kept per user, so people sharing a computer each keep their own.
 */
export function useWallpaper(userId: number) {
    const stored = useSyncExternalStore(
        subscribe,
        () => readStorage(key(userId)) ?? memory.get(userId) ?? null,
        () => null,
    );
    const id: WallpaperId = isWallpaperId(stored) ? stored : DEFAULT_WALLPAPER;
    const setWallpaper = useCallback(
        (next: WallpaperId) => {
            if (next === DEFAULT_WALLPAPER) {
                memory.delete(userId);
                writeStorage(key(userId), null);
            } else {
                memory.set(userId, next);
                writeStorage(key(userId), next);
            }

            listeners.forEach((listener) => listener());
        },
        [userId],
    );

    return [id, setWallpaper] as const;
}
