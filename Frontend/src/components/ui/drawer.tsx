import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

interface DrawerContentProps {
    title: string;
    children: ReactNode;
    side?: 'left' | 'right';
    className?: string;
    /** Hide the title bar (used by the navigation drawer which has its own header). */
    hideHeader?: boolean;
}

/** Side panel for navigation (left) and detail/edit forms (right). Full width on phones. */
export function DrawerContent({
    title,
    children,
    side = 'right',
    className,
    hideHeader = false,
}: DrawerContentProps) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/40" />
            <DialogPrimitive.Content
                aria-describedby={undefined}
                className={cn(
                    'pb-safe pt-safe fixed inset-y-0 z-50 flex w-full flex-col bg-surface shadow-float focus:outline-none sm:max-w-md',
                    side === 'left'
                        ? 'left-0 max-w-[85vw] animate-drawer-in sm:max-w-xs'
                        : 'right-0 animate-fade-in',
                    className,
                )}
            >
                {hideHeader ? (
                    <DialogPrimitive.Title className="sr-only">
                        {title}
                    </DialogPrimitive.Title>
                ) : (
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3">
                        <DialogPrimitive.Title className="text-base font-bold text-slate-900">
                            {title}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Close
                            aria-label="Close"
                            className="flex size-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none sm:size-9"
                        >
                            <X className="size-5" />
                        </DialogPrimitive.Close>
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}
