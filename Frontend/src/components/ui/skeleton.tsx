import { cn } from '@/lib/utils';

/** Loading placeholder with the guide's shine sweep (s6). */
export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn(
                'relative overflow-hidden rounded-lg bg-slate-100',
                className,
            )}
        >
            <span className="absolute inset-0 animate-shine bg-linear-to-r from-transparent via-white/55 to-transparent" />
        </div>
    );
}
