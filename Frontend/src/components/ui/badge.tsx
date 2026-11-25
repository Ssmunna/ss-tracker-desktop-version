import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Status colours are fixed (guide s1): red, green, amber, blue, emerald. */
const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap',
    {
        variants: {
            tone: {
                neutral: 'bg-slate-100 text-slate-700',
                brand: 'bg-brand-100 text-brand-600',
                success: 'bg-emerald-50 text-emerald-700',
                green: 'bg-green-50 text-green-700',
                warning: 'bg-amber-50 text-amber-700',
                danger: 'bg-red-50 text-red-700',
                info: 'bg-blue-50 text-blue-700',
            },
        },
        defaultVariants: { tone: 'neutral' },
    },
);

export function Badge({
    className,
    tone,
    ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
    return (
        <span className={cn(badgeVariants({ tone }), className)} {...props} />
    );
}
