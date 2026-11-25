import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { getInitials } from '@/lib/initials';
import { cn } from '@/lib/utils';

const sizes = {
    sm: 'size-8 text-[11px]',
    md: 'size-10 text-xs',
    lg: 'size-14 text-base',
};

export function Avatar({
    name,
    src,
    size = 'md',
    className,
}: {
    name?: string;
    src?: string | null;
    size?: keyof typeof sizes;
    className?: string;
}) {
    return (
        <AvatarPrimitive.Root
            className={cn(
                'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-600 select-none',
                sizes[size],
                className,
            )}
        >
            {src ? (
                <AvatarPrimitive.Image
                    src={src}
                    alt={name ?? ''}
                    className="size-full object-cover"
                />
            ) : null}
            <AvatarPrimitive.Fallback delayMs={src ? 300 : 0}>
                {getInitials(name)}
            </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
    );
}
