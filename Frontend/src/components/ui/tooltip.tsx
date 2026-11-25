import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

/** Hover/focus hint. Never the only way to reach information (touch has no hover). */
export function Tooltip({
    content,
    children,
}: {
    content: ReactNode;
    children: ReactNode;
}) {
    return (
        <TooltipPrimitive.Root delayDuration={200}>
            <TooltipPrimitive.Trigger asChild>
                {children}
            </TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    sideOffset={6}
                    className="z-[70] animate-fade-in rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                >
                    {content}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}
