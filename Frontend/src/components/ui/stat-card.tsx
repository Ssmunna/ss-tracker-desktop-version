import type { LucideIcon } from 'lucide-react';

import { Card } from './card';

/** Dashboard tile. `highlight` uses the tinted card. */
export function StatCard({
    label,
    value,
    icon: Icon,
    hint,
    highlight = false,
    delay,
}: {
    label: string;
    value: number | string;
    icon?: LucideIcon;
    hint?: string;
    highlight?: boolean;
    delay?: number;
}) {
    return (
        <Card
            variant={highlight ? 'tinted' : 'standard'}
            animate
            delay={delay}
            className="flex items-start justify-between gap-3"
        >
            <div className="min-w-0">
                <p className="text-2xl font-bold whitespace-nowrap text-slate-900 2xl:text-3xl">
                    {value}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                    {label}
                </p>
                {hint ? (
                    <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
                ) : null}
            </div>
            {Icon ? (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <Icon className="size-5" />
                </span>
            ) : null}
        </Card>
    );
}
