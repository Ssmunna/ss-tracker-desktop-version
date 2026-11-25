import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export interface RowMenuItem {
    key: string;
    label: string;
    icon?: ReactNode;
    active?: boolean;
    onSelect: () => void;
}

/**
 * One light popup menu for a whole table. Rows only report where to open it, so hundreds of
 * rows never each mount their own dropdown.
 */
export function RowMenu({
    anchor,
    items,
    onClose,
    width = 'w-48',
}: {
    anchor: DOMRect;
    items: RowMenuItem[];
    onClose: () => void;
    width?: string;
}) {
    const box = useRef<HTMLDivElement>(null);
    const [place, setPlace] = useState({
        left: anchor.left,
        top: anchor.bottom + 4,
    });

    useLayoutEffect(() => {
        const node = box.current;

        if (!node) {
            return;
        }

        const { width: w, height: h } = node.getBoundingClientRect();
        const below = anchor.bottom + 4;

        setPlace({
            left: Math.max(8, Math.min(anchor.left, window.innerWidth - w - 8)),
            top:
                below + h > window.innerHeight - 8
                    ? Math.max(8, anchor.top - h - 4)
                    : below,
        });
    }, [anchor]);

    useEffect(() => {
        const close = (event: Event) => {
            if (!box.current?.contains(event.target as Node)) {
                onClose();
            }
        };
        const key = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', key);
        window.addEventListener('scroll', onClose, true);
        window.addEventListener('resize', onClose);

        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', key);
            window.removeEventListener('scroll', onClose, true);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    return createPortal(
        <div
            ref={box}
            role="menu"
            style={{ left: place.left, top: place.top }}
            className={cn(
                'fixed z-[60] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-surface p-1.5 shadow-xl',
                width,
            )}
        >
            {items.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        onClose();
                        item.onSelect();
                    }}
                    className={cn(
                        'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm hover:bg-slate-100',
                        item.active
                            ? 'font-bold text-slate-900'
                            : 'text-slate-700',
                    )}
                >
                    {item.icon}
                    <span className="min-w-0 flex-1 truncate">
                        {item.label}
                    </span>
                </button>
            ))}
        </div>,
        document.body,
    );
}
