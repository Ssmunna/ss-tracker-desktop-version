import { cn } from '@/lib/utils';

/** Progress bar gradient: guide s6 (`from-ember-400 to-ember-600`). */
export function ProgressBar({
    value,
    label,
    className,
}: {
    value: number;
    label?: string;
    className?: string;
}) {
    const clamped = Math.min(100, Math.max(0, value));

    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped)}
            aria-label={label}
            className={cn(
                'h-2 w-full overflow-hidden rounded-full bg-slate-100',
                className,
            )}
        >
            <div
                className="h-full rounded-full bg-linear-to-r from-ember-400 to-ember-600 transition-[width] duration-500"
                style={{ width: `${clamped}%` }}
            />
        </div>
    );
}
