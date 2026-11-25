import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
    className,
    sideOffset = 6,
    align = 'end',
    ...props
}: React.ComponentProps<typeof DropdownPrimitive.Content>) {
    return (
        <DropdownPrimitive.Portal>
            <DropdownPrimitive.Content
                sideOffset={sideOffset}
                align={align}
                className={cn(
                    'z-[60] min-w-48 animate-fade-in rounded-xl border border-slate-200/90 bg-surface p-1 shadow-float',
                    className,
                )}
                {...props}
            />
        </DropdownPrimitive.Portal>
    );
}

export function DropdownMenuItem({
    className,
    destructive,
    ...props
}: React.ComponentProps<typeof DropdownPrimitive.Item> & {
    destructive?: boolean;
}) {
    return (
        <DropdownPrimitive.Item
            className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none select-none data-[disabled]:opacity-40 sm:min-h-9',
                destructive
                    ? 'text-red-600 data-[highlighted]:bg-red-50'
                    : 'text-slate-900 data-[highlighted]:bg-slate-100',
                className,
            )}
            {...props}
        />
    );
}

export function DropdownMenuLabel({
    className,
    ...props
}: React.ComponentProps<typeof DropdownPrimitive.Label>) {
    return (
        <DropdownPrimitive.Label
            className={cn('px-3 py-2 text-xs text-slate-500', className)}
            {...props}
        />
    );
}

export function DropdownMenuSeparator({
    className,
    ...props
}: React.ComponentProps<typeof DropdownPrimitive.Separator>) {
    return (
        <DropdownPrimitive.Separator
            className={cn('my-1 h-px bg-slate-100', className)}
            {...props}
        />
    );
}

export const DropdownMenuSub = DropdownPrimitive.Sub;

export function DropdownMenuSubTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DropdownPrimitive.SubTrigger>) {
    return (
        <DropdownPrimitive.SubTrigger
            className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 outline-none select-none data-[highlighted]:bg-slate-100 data-[state=open]:bg-slate-100 sm:min-h-9',
                className,
            )}
            {...props}
        >
            {children}
            <ChevronRight className="ml-auto size-4 text-slate-400" />
        </DropdownPrimitive.SubTrigger>
    );
}

export function DropdownMenuSubContent({
    className,
    ...props
}: React.ComponentProps<typeof DropdownPrimitive.SubContent>) {
    return (
        <DropdownPrimitive.Portal>
            <DropdownPrimitive.SubContent
                sideOffset={4}
                className={cn(
                    'z-[60] min-w-44 animate-fade-in rounded-xl border border-slate-200/90 bg-surface p-1 shadow-float',
                    className,
                )}
                {...props}
            />
        </DropdownPrimitive.Portal>
    );
}
