import { useSyncExternalStore } from 'react';

/** Tailwind breakpoints (min-width), so JS and CSS agree. */
export const breakpoints = {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
} as const;

export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (notify) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', notify);

            return () => list.removeEventListener('change', notify);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}
