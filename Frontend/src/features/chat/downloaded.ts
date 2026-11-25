import { useSyncExternalStore } from 'react';

const KEY = 'dr.chat.downloaded';
const listeners = new Set<() => void>();

function read(): number[] {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]') as number[];
    } catch {
        return [];
    }
}

let cache = new Set(read());

/** Remember that this attachment was saved on this device. */
export function markDownloaded(id: number) {
    if (cache.has(id)) {
        return;
    }

    cache = new Set(cache).add(id);

    try {
        localStorage.setItem(KEY, JSON.stringify([...cache].slice(-2000)));
    } catch {
        // Private mode: the mark only lasts for this visit.
    }

    listeners.forEach((listener) => listener());
}

/** Whether this attachment was already downloaded here, and updates when it is. */
export function useDownloaded(id: number): boolean {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        () => cache.has(id),
    );
}
