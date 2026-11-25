import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Conversation list and thread. Phones show one at a time (`showThread`
 * switches, the thread has a back button); from `lg` they sit side by side.
 */
export function ChatLayout({
    list,
    thread,
    showThread,
}: {
    list: ReactNode;
    thread: ReactNode;
    showThread: boolean;
}) {
    return (
        <div className="grid h-[calc(100dvh-5.5rem)] grid-cols-1 overflow-hidden rounded-2xl border border-white/60 bg-glass shadow-glass glass-blur sm:h-[calc(100dvh-6.5rem)] lg:grid-cols-[22rem_1fr]">
            <aside
                className={cn(
                    'min-h-0 flex-col border-slate-200/90 lg:flex lg:border-r',
                    showThread ? 'hidden' : 'flex',
                )}
            >
                {list}
            </aside>
            <section
                className={cn(
                    'min-h-0 flex-col lg:flex',
                    showThread ? 'flex' : 'hidden',
                )}
            >
                {thread}
            </section>
        </div>
    );
}
