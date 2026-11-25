import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PersonRef } from '@/api/project-types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Search-as-you-type employee dropdown; picking a row calls `onPick` and clears the box. */
export function DeveloperPicker({
    options,
    onPick,
    disabled,
    placeholder = 'Search employee to add',
    className,
    autoFocus,
}: {
    options: PersonRef[];
    onPick: (developer: PersonRef) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}) {
    const [term, setTerm] = useState('');
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const matches = useMemo(() => {
        const query = term.trim().toLowerCase();

        return options.filter(
            (developer) =>
                query === '' ||
                `${developer.name} ${developer.developer_code}`
                    .toLowerCase()
                    .includes(query),
        );
    }, [options, term]);

    useEffect(() => {
        const close = (event: MouseEvent) => {
            if (!box.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', close);

        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div ref={box} className={cn('relative w-full', className)}>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
                density="compact"
                aria-label="Search employee"
                placeholder={placeholder}
                value={term}
                disabled={disabled}
                autoComplete="off"
                autoFocus={autoFocus}
                onFocus={() => setOpen(true)}
                onChange={(event) => {
                    setTerm(event.target.value);
                    setOpen(true);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        setOpen(false);
                    }
                }}
                className="pl-9"
            />
            {open ? (
                <ul
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-surface p-1 shadow-lg"
                >
                    {matches.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-slate-500">
                            No employee found
                        </li>
                    ) : (
                        matches.map((developer) => (
                            <li key={developer.id} role="option">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                                    onClick={() => {
                                        onPick(developer);
                                        setTerm('');
                                        setOpen(false);
                                    }}
                                >
                                    <span className="font-medium text-slate-900">
                                        {developer.name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {developer.developer_code}
                                    </span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            ) : null}
        </div>
    );
}
