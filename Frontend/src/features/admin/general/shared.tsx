import { Link, useLocation } from 'react-router';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TABS = [
    { to: '/admin/general-tasks', label: 'Tasks' },
    { to: '/admin/general-tasks/overview', label: 'Overview' },
];

/** Switches between the task list and the per-employee overview. */
export function GeneralTabs() {
    const { pathname } = useLocation();

    return (
        <nav aria-label="General tasks" className="flex gap-2">
            {TABS.map((tab) => (
                <Link
                    key={tab.to}
                    to={tab.to}
                    aria-current={pathname === tab.to ? 'page' : undefined}
                    className={cn(
                        'flex min-h-10 items-center rounded-full border px-4 text-xs font-bold transition-colors',
                        pathname === tab.to
                            ? 'border-brand bg-brand text-on-brand'
                            : 'border-slate-200 bg-surface text-slate-700 hover:border-ember-300 hover:bg-brand-50',
                    )}
                >
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
}

export function MonthField({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Field label="Month" className="lg:w-44">
            <Input
                density="compact"
                type="month"
                value={value}
                onChange={(event) =>
                    event.target.value && onChange(event.target.value)
                }
            />
        </Field>
    );
}
