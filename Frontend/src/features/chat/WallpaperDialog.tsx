import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

import {
    DEFAULT_WALLPAPER,
    WALLPAPERS,
    wallpaperClass,
    type WallpaperId,
} from './wallpapers';

/** Picks the background of the message area; applies at once, so the chat behind shows it too. */
export function WallpaperDialog({
    open,
    onOpenChange,
    value,
    onChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: WallpaperId;
    onChange: (id: WallpaperId) => void;
}) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent
                title="Chat wallpaper"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            disabled={value === DEFAULT_WALLPAPER}
                            onClick={() => onChange(DEFAULT_WALLPAPER)}
                        >
                            Reset to default
                        </Button>
                        <ModalClose asChild>
                            <Button>Done</Button>
                        </ModalClose>
                    </>
                }
            >
                <div
                    aria-label="Preview"
                    role="img"
                    className={cn(
                        'mb-4 flex h-32 flex-col justify-center gap-2 rounded-xl border border-slate-200/70 px-4',
                        wallpaperClass(value),
                    )}
                >
                    <span className="max-w-[75%] self-start rounded-2xl rounded-bl-md bg-bubble px-3 py-1.5 text-sm text-slate-900 shadow-[0_1px_2px_rgba(38,53,68,0.12)]">
                        Standup in five minutes?
                    </span>
                    <span className="max-w-[75%] self-end rounded-2xl rounded-br-md bg-brand px-3 py-1.5 text-sm text-on-brand shadow-[0_1px_2px_rgba(38,53,68,0.12)]">
                        On my way.
                    </span>
                </div>
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {WALLPAPERS.map((wallpaper) => {
                        const selected = wallpaper.id === value;

                        return (
                            <li key={wallpaper.id}>
                                <button
                                    type="button"
                                    aria-pressed={selected}
                                    aria-label={wallpaper.label}
                                    onClick={() => onChange(wallpaper.id)}
                                    className="group flex w-full flex-col items-center gap-1 focus-visible:outline-none"
                                >
                                    <span
                                        className={cn(
                                            'relative flex h-16 w-full items-center justify-center rounded-xl border transition group-focus-visible:ring-2 group-focus-visible:ring-orange-500',
                                            wallpaperClass(wallpaper.id),
                                            selected
                                                ? 'border-brand ring-2 ring-brand'
                                                : 'border-slate-200 group-hover:border-ember-300',
                                        )}
                                    >
                                        {selected ? (
                                            <span className="flex size-6 items-center justify-center rounded-full bg-brand text-on-brand">
                                                <Check className="size-4" />
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className={cn(
                                            'text-xs',
                                            selected
                                                ? 'font-bold text-slate-900'
                                                : 'text-slate-600',
                                        )}
                                    >
                                        {wallpaper.label}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </ModalContent>
        </Modal>
    );
}
