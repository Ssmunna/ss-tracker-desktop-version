import { SlidersHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { breakpoints, useMediaQuery } from '@/hooks/useMediaQuery';

import { Button } from './button';
import { Drawer, DrawerContent } from './drawer';

/**
 * Generic filter container. Inline from `lg`, a "Filters" button opening a
 * sheet below it, so phones never get a wall of inputs.
 */
export function FilterBar({
    children,
    activeCount = 0,
    onReset,
}: {
    children: ReactNode;
    activeCount?: number;
    onReset?: () => void;
}) {
    const isLarge = useMediaQuery(breakpoints.lg);
    const [open, setOpen] = useState(false);

    if (isLarge) {
        return (
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/90 bg-surface p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
                {children}
                {onReset && activeCount > 0 ? (
                    <Button variant="ghost" size="sm" onClick={onReset}>
                        Reset
                    </Button>
                ) : null}
            </div>
        );
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <Button variant="outline" onClick={() => setOpen(true)}>
                <SlidersHorizontal className="size-4" />
                Filters
                {activeCount > 0 ? (
                    <span className="rounded-full bg-brand px-1.5 text-[10px] text-on-brand">
                        {activeCount}
                    </span>
                ) : null}
            </Button>
            <DrawerContent title="Filters">
                <div className="space-y-4 p-5">
                    {children}
                    <div className="flex gap-2 pt-2">
                        {onReset ? (
                            <Button variant="secondary" block onClick={onReset}>
                                Reset
                            </Button>
                        ) : null}
                        <Button block onClick={() => setOpen(false)}>
                            Apply
                        </Button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
