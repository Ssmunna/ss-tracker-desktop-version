import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Renders a long list in slices: the first `step` items, then `step` more each time the
 * sentinel scrolls into view. Hundreds of rows with menus stay light, and a tab switch
 * never has to mount (or unmount) them all at once. `resetKey` starts over from the top.
 */
export function useIncremental<T>(items: T[], resetKey: string, step = 40) {
    const [state, setState] = useState({ key: resetKey, count: step });
    // A new key (a filter changed) starts from the first slice again.
    const count = state.key === resetKey ? state.count : step;
    const observer = useRef<IntersectionObserver | null>(null);
    const total = items.length;

    const more = useCallback(() => {
        setState((current) => ({
            key: resetKey,
            count: (current.key === resetKey ? current.count : step) + step,
        }));
    }, [resetKey, step]);

    useEffect(() => () => observer.current?.disconnect(), []);

    // Attach to the element after the last row.
    const sentinel = useCallback(
        (node: HTMLElement | null) => {
            observer.current?.disconnect();

            if (!node) {
                return;
            }

            observer.current = new IntersectionObserver(
                (entries) => {
                    if (entries.some((entry) => entry.isIntersecting)) {
                        more();
                    }
                },
                { rootMargin: '400px' },
            );
            observer.current.observe(node);
        },
        [more],
    );

    return {
        visible: items.slice(0, count),
        hasMore: count < total,
        more,
        sentinel,
    };
}
