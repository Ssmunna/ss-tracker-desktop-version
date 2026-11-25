import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** Filters live in the address bar so a filtered list can be linked and survives a refresh. */
export function useUrlParams() {
    const [params, setParams] = useSearchParams();

    const set = useCallback(
        (next: Record<string, string | null>) => {
            const copy = new URLSearchParams(params);

            for (const [key, value] of Object.entries(next)) {
                if (value) {
                    copy.set(key, value);
                } else {
                    copy.delete(key);
                }
            }

            // Any change of a filter goes back to the first page.
            if (!('page' in next)) {
                copy.delete('page');
            }

            setParams(copy, { replace: true });
        },
        [params, setParams],
    );

    return {
        params,
        set,
        reset: () => setParams(new URLSearchParams(), { replace: true }),
    };
}
