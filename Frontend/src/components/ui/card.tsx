import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Recipes: THEME-STYLE-GUIDE sections 4 and 5. */
const cardVariants = cva('relative rounded-2xl', {
    variants: {
        variant: {
            standard:
                'border border-white/60 bg-glass p-4 shadow-glass glass-blur sm:p-5',
            tinted: 'border border-slate-200/90 bg-brand-50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
            accent: 'overflow-hidden border border-brand-200 bg-glass p-4 shadow-glass glass-blur sm:p-5',
            hero: 'w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-float sm:p-10',
            success:
                'rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center',
            flush: 'border border-white/60 bg-glass shadow-glass glass-blur',
        },
        /** Clickable card: lift, orange border, tint and glow (guide section 5). */
        interactive: {
            true: 'group transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-ember-300 hover:bg-brand-50 hover:shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--color-ember-500)_35%,transparent)]',
            false: '',
        },
        /** Entrance animation; stagger with the `delay` prop. */
        animate: {
            true: 'animate-card-in',
            false: '',
        },
    },
    compoundVariants: [
        {
            variant: 'tinted',
            interactive: true,
            className: 'hover:bg-brand-150',
        },
    ],
    defaultVariants: {
        variant: 'standard',
        interactive: false,
        animate: false,
    },
});

export interface CardProps
    extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
    /** Entrance animation delay in ms. */
    delay?: number;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        { className, variant, interactive, animate, delay, style, ...props },
        ref,
    ) => (
        <div
            ref={ref}
            className={cn(
                cardVariants({ variant, interactive, animate }),
                className,
            )}
            style={
                delay !== undefined
                    ? { animationDelay: `${delay}ms`, ...style }
                    : style
            }
            {...props}
        />
    ),
);
Card.displayName = 'Card';

export function CardTitle({
    className,
    ...props
}: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn('text-sm font-bold text-slate-900', className)}
            {...props}
        />
    );
}

export function CardDescription({
    className,
    ...props
}: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('text-xs text-slate-500', className)} {...props} />;
}
