import { forwardRef, useId } from 'react';

import { cn } from '@/lib/utils';

/**
 * The mascot's house, drawn like the 3D one (orange roof, chimney, door, lit window) so the 3D house
 * pops out exactly where this one was.
 */
function HouseGlyph({ className }: { className?: string }) {
    const roof = useId();
    const wall = useId();

    return (
        <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            className={className}
            fill="none"
        >
            <defs>
                <linearGradient id={roof} x1="0" y1="0" x2="0" y2="1">
                    <stop
                        offset="0"
                        style={{ stopColor: 'var(--color-brand-400)' }}
                    />
                    <stop
                        offset="1"
                        style={{ stopColor: 'var(--color-brand-600)' }}
                    />
                </linearGradient>
                <linearGradient id={wall} x1="0" y1="0" x2="1" y2="1">
                    <stop
                        offset="0"
                        style={{ stopColor: 'var(--color-ember-50)' }}
                    />
                    <stop
                        offset="1"
                        style={{ stopColor: 'var(--color-ember-200)' }}
                    />
                </linearGradient>
            </defs>
            <rect
                x="21"
                y="5"
                width="3.6"
                height="8"
                rx="0.9"
                className="fill-ember-700"
            />
            <rect
                x="6"
                y="15.5"
                width="20"
                height="13"
                rx="2.2"
                fill={`url(#${wall})`}
                className="stroke-ember-200"
                strokeWidth="1"
            />
            <path
                d="M2.2 17.6 16 4.6l13.8 13Z"
                fill={`url(#${roof})`}
                className="stroke-brand-600"
                strokeWidth="1"
                strokeLinejoin="round"
            />
            <rect
                x="9.6"
                y="19.6"
                width="6.2"
                height="9"
                rx="1.3"
                className="fill-ember-700"
            />
            <circle cx="14.1" cy="24.4" r="0.7" className="fill-ember-300" />
            <rect
                x="18.4"
                y="19.8"
                width="5.4"
                height="5"
                rx="1.1"
                className="fill-ember-300 stroke-ember-400"
                strokeWidth="0.8"
            />
        </svg>
    );
}

/** The header house. The 3D house pops out exactly on top of it, so this one hides meanwhile. */
export const MascotHomeButton = forwardRef<
    HTMLButtonElement,
    { away: boolean; onClick: () => void }
>(function MascotHomeButton({ away, onClick }, ref) {
    return (
        <button
            ref={ref}
            type="button"
            aria-label="Notifications mascot"
            onClick={onClick}
            className={cn(
                'group relative flex size-11 items-center justify-center rounded-xl sm:size-10',
                'border border-brand-200 bg-linear-to-b from-surface to-brand-50 shadow-sm',
                'transition duration-200 hover:-translate-y-px hover:border-brand-400 hover:shadow-brand',
                'focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none',
            )}
        >
            <HouseGlyph
                className={cn(
                    'size-7 transition duration-200 group-hover:scale-105',
                    away && 'opacity-0',
                )}
            />
        </button>
    );
});
