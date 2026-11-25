import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

export function Switch({
    className,
    ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root
            className={cn(
                'inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300 transition focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-brand',
                className,
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
        </SwitchPrimitive.Root>
    );
}
