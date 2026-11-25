import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

interface ModalContentProps {
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
    /** Wider dialog on large screens (forms, previews). */
    size?: 'md' | 'lg';
}

/**
 * Guide s4 dialog (`rounded-2xl bg-surface p-6 shadow-2xl`).
 * Mobile first: bottom sheet below `sm`, centered dialog from `sm`.
 */
export function ModalContent({
    title,
    description,
    children,
    footer,
    className,
    size = 'md',
}: ModalContentProps) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/40" />
            <DialogPrimitive.Content
                className={cn(
                    'pb-safe fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] animate-sheet-up flex-col rounded-t-2xl bg-surface shadow-float focus:outline-none',
                    'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-fade-in sm:rounded-2xl',
                    size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl',
                    className,
                )}
            >
                <div className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
                    <div className="min-w-0 space-y-1">
                        <DialogPrimitive.Title className="text-base font-bold text-slate-900">
                            {title}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description
                            className={cn(
                                'text-xs text-slate-500',
                                !description && 'sr-only',
                            )}
                        >
                            {description ?? title}
                        </DialogPrimitive.Description>
                    </div>
                    <DialogPrimitive.Close
                        aria-label="Close"
                        className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none sm:size-9"
                    >
                        <X className="size-5" />
                    </DialogPrimitive.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">
                    {children}
                </div>
                {footer ? (
                    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end sm:px-6 [&>*]:w-full sm:[&>*]:w-auto">
                        {footer}
                    </div>
                ) : null}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}
