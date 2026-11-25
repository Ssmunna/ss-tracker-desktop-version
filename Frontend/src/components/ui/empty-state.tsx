import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-3 px-4 py-12 text-center',
                className,
            )}
        >
            {Icon ? (
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                    <Icon className="size-6" />
                </span>
            ) : null}
            <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                {description ? (
                    <p className="mx-auto max-w-sm text-xs break-words text-slate-500">
                        {description}
                    </p>
                ) : null}
            </div>
            {action}
        </div>
    );
}

/** Error counterpart of EmptyState, with a retry action. */
export function ErrorState({
    title = 'Something went wrong',
    description,
    action,
}: {
    title?: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center"
        >
            <p className="text-sm font-bold text-red-700">{title}</p>
            {description ? (
                <p className="max-w-sm text-xs text-red-600">{description}</p>
            ) : null}
            {action}
        </div>
    );
}
