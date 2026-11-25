import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Checkbox({
    className,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white transition focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-on-brand',
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator>
                <Check className="size-3.5" strokeWidth={3} />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}
