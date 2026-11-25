import { useSearchParams } from 'react-router';

import type { InboxQuery } from '@/api/approval-types';

const KEYS = [
    'status',
    'priority',
    'date_from',
    'date_to',
    'department_id',
    'project_id',
    'category_id',
    'phase_id',
] as const;

/** Inbox filters live in the address, so a filtered view can be shared and survives a reload. */
export function useInboxParams() {
    const [params, setParams] = useSearchParams();
    const query: InboxQuery = {
        per_page: 20,
        page: Number(params.get('page') ?? 1),
    };

    for (const key of KEYS) {
        const value = params.get(key);

        if (value) {
            query[key] = value;
        }
    }

    const set = (
        next: Partial<Record<(typeof KEYS)[number] | 'page', string | null>>,
    ) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value) {
                copy.set(key, value);
            } else {
                copy.delete(key);
            }
        }

        if (!('page' in next)) {
            copy.delete('page');
        }

        setParams(copy, { replace: true });
    };

    const activeFilters = KEYS.filter(
        (key) => key !== 'status' && query[key],
    ).length;

    return {
        query,
        set,
        activeFilters,
        reset: () => {
            const copy = new URLSearchParams();
            const status = params.get('status');

            if (status) {
                copy.set('status', status);
            }

            setParams(copy, { replace: true });
        },
    };
}
