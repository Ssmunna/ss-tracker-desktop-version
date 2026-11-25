import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ChatMessage } from '@/api/chat-types';
import {
    useAttachmentUrlQuery,
    useLazyAttachmentUrlQuery,
} from '@/api/endpoints/chat';
import { Button } from '@/components/ui/button';
import { saveUrl } from '@/lib/download';

import { markDownloaded } from './downloaded';

const onDark = 'text-white hover:bg-white/15 hover:text-white';

/**
 * Full-size view of a chat image inside the app (also in the desktop app, where a link would
 * leave for the browser). The storage link only lives a few minutes, so a new one is asked for
 * every time the viewer opens and for every download, never an old one kept from the message list.
 */
export function ImageViewer({
    item,
    onClose,
}: {
    item: ChatMessage['attachments'][number];
    onClose: () => void;
}) {
    const { data, isFetching, isError } = useAttachmentUrlQuery(
        { id: item.id },
        { refetchOnMountOrArgChange: true },
    );
    const [load, { isFetching: saving }] = useLazyAttachmentUrlQuery();
    const [broken, setBroken] = useState(false);
    const failed = isError || broken;

    const save = async () => {
        try {
            const { url } = await load(
                { id: item.id, download: true },
                false,
            ).unwrap();

            saveUrl(url, item.original_name);
            markDownloaded(item.id);
        } catch {
            toast.error('Could not download the file.');
        }
    };

    return (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[70] animate-fade-in bg-black/92 backdrop-blur-sm" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className="pt-safe pb-safe fixed inset-0 z-[70] flex flex-col focus:outline-none"
                >
                    <div className="flex min-h-14 items-center gap-2 px-3 sm:px-4">
                        <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                            {item.original_name}
                        </DialogPrimitive.Title>
                        <Button
                            variant="ghost"
                            className={onDark}
                            loading={saving}
                            onClick={() => void save()}
                        >
                            <Download className="size-4" /> Download
                        </Button>
                        <DialogPrimitive.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Close"
                                className={onDark}
                            >
                                <X className="size-5" />
                            </Button>
                        </DialogPrimitive.Close>
                    </div>
                    <div
                        className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6"
                        onClick={(event) =>
                            event.target === event.currentTarget && onClose()
                        }
                    >
                        {failed ? (
                            <p className="text-sm text-white/80">
                                The image could not be loaded. Use Download
                                instead.
                            </p>
                        ) : !data || isFetching ? (
                            <Loader2 className="size-8 animate-spin text-white/80" />
                        ) : (
                            <img
                                src={data.url}
                                alt={item.original_name}
                                onError={() => setBroken(true)}
                                className="max-h-full max-w-full rounded-lg object-contain shadow-float"
                            />
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
