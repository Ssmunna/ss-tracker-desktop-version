import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

/** Scrolls horizontally on phones instead of wrapping. */
export function TabsList({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            className={cn(
                '-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-slate-200/90 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden',
                className,
            )}
            {...props}
        />
    );
}

export function TabsTrigger({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            className={cn(
                '-mb-px min-h-11 shrink-0 border-b-2 border-transparent px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none data-[state=active]:border-brand data-[state=active]:text-brand-600 sm:min-h-10',
                className,
            )}
            {...props}
        />
    );
}

export function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            className={cn('pt-4 focus:outline-none', className)}
            {...props}
        />
    );
}
