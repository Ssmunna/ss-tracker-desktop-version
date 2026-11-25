import { Bookmark } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { assetUrl } from '@/lib/assetUrl';
import { cn } from '@/lib/utils';

/** A conversation's picture: initials, or a bookmark for "Saved Messages". */
export function ChatAvatar({
    type,
    name,
    src,
    size = 'md',
}: {
    type: string;
    name: string;
    src?: string | null;
    size?: 'sm' | 'md';
}) {
    return type === 'saved' ? (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full bg-brand text-on-brand',
                size === 'sm' ? 'size-8' : 'size-10',
            )}
        >
            <Bookmark className={size === 'sm' ? 'size-4' : 'size-5'} />
        </span>
    ) : (
        <Avatar name={name} src={assetUrl(src)} size={size} />
    );
}
