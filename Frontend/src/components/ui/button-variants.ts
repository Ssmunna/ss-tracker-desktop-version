import { cva } from 'class-variance-authority';

/** Recipes: THEME-STYLE-GUIDE sections 5, 6 and 7. */
export const buttonVariants = cva(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
    {
        variants: {
            variant: {
                /** Main CTA gradient */
                primary:
                    'bg-linear-to-r from-brand to-ember-600 font-bold text-on-brand shadow-brand hover:brightness-105',
                /** Simple solid orange */
                solid: 'bg-orange-600 font-semibold text-white hover:bg-orange-700',
                /** Sidebar CTA */
                brand: 'rounded-sm bg-brand text-[11px] font-semibold tracking-[0.55px] text-on-brand uppercase hover:bg-brand-600',
                secondary:
                    'bg-slate-100 font-bold text-slate-900 hover:bg-slate-200',
                ghost: 'font-medium text-slate-900 hover:bg-slate-100',
                outline:
                    'border border-slate-200 bg-surface font-bold text-slate-900 hover:border-ember-300 hover:bg-brand-50',
                destructiveSoft:
                    'bg-red-50/0 font-bold text-red-600 hover:bg-red-50',
                destructive: 'bg-red-600 font-bold text-white hover:bg-red-700',
            },
            size: {
                // 44px touch target on phones, compact from sm:
                default: 'min-h-11 rounded-xl px-4 py-2 text-xs sm:min-h-9',
                sm: 'min-h-10 rounded-lg px-3 py-1.5 text-[11px] sm:min-h-8',
                lg: 'min-h-12 rounded-xl px-5 py-3 text-sm',
                icon: 'size-11 rounded-xl sm:size-9',
            },
            block: {
                true: 'w-full',
                false: '',
            },
        },
        defaultVariants: { variant: 'primary', size: 'default', block: false },
    },
);
