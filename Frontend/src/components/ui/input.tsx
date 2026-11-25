import {
    forwardRef,
    type InputHTMLAttributes,
    type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

/** Guide section 7. Default: roomy slate-50 field. Compact: white field for dense forms. */
const base =
    'w-full text-sm font-medium text-slate-900 transition placeholder:font-normal placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400';
const fieldStyles = {
    default:
        'min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-orange-500 sm:min-h-10',
    compact:
        'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-orange-500/50 sm:min-h-9',
};

type Density = keyof typeof fieldStyles;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    density?: Density;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, density = 'default', ...props }, ref) => (
        <input
            ref={ref}
            className={cn(base, fieldStyles[density], className)}
            {...props}
        />
    ),
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    density?: Density;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, density = 'default', rows = 4, ...props }, ref) => (
        <textarea
            ref={ref}
            rows={rows}
            className={cn(base, fieldStyles[density], 'min-h-24', className)}
            {...props}
        />
    ),
);
Textarea.displayName = 'Textarea';
