import {
    CornerDownRight,
    ExternalLink,
    FileText,
    Link2,
    Mic,
    Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { ChatMessage } from '@/api/chat-types';
import { useLazySearchMessagesQuery } from '@/api/endpoints/chat';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';

import { formatBytes, isVoice } from './messageText';

type Tab = 'messages' | 'files' | 'links';

const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'messages', label: 'Messages' },
    { key: 'files', label: 'Files' },
    { key: 'links', label: 'Links' },
];

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

const hostOf = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

/** Search one conversation: its messages, its files, or the links people shared. */
export function SearchPanel({
    conversationId,
    onPick,
}: {
    conversationId: number;
    onPick: (messageId: number) => void;
}) {
    const [tab, setTab] = useState<Tab>('messages');
    const [text, setText] = useState('');
    const [search, { isFetching, isError }] = useLazySearchMessagesQuery();
    const [items, setItems] = useState<ChatMessage[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const query = text.trim();
    // Messages need a term; files and links list everything until a term narrows them.
    const ready = tab !== 'messages' || query.length >= 2;

    useEffect(() => {
        if (!ready) {
            return;
        }

        let stale = false;
        const timer = window.setTimeout(
            () => {
                void search({
                    id: conversationId,
                    type: tab,
                    q: query.length >= 2 ? query : undefined,
                })
                    .unwrap()
                    .then((page) => {
                        if (!stale) {
                            setItems(page.messages);
                            setHasMore(page.has_more);
                            setLoaded(true);
                        }
                    })
                    .catch(() => undefined);
            },
            query === '' ? 0 : 350,
        );

        return () => {
            stale = true;
            window.clearTimeout(timer);
        };
    }, [ready, tab, query, conversationId, search]);

    const more = async () => {
        const last = items[items.length - 1];

        if (!last) {
            return;
        }

        try {
            const page = await search({
                id: conversationId,
                type: tab,
                q: query.length >= 2 ? query : undefined,
                before: last.id,
            }).unwrap();
            setItems((current) => [...current, ...page.messages]);
            setHasMore(page.has_more);
        } catch {
            // The list stays as it is; trying again loads the same page.
        }
    };

    const links = useMemo(
        () =>
            tab === 'links'
                ? items.flatMap((message) =>
                      (message.body?.match(URL_PATTERN) ?? []).map((raw) => ({
                          message,
                          url: raw.replace(/[.,;:!?)]+$/, ''),
                      })),
                  )
                : [],
        [items, tab],
    );

    const switchTab = (next: Tab) => {
        setTab(next);
        setItems([]);
        setHasMore(false);
        setLoaded(false);
    };

    const empty =
        loaded && ready && !isFetching && items.length === 0
            ? tab === 'files'
                ? 'No file found'
                : tab === 'links'
                  ? 'No link found'
                  : 'No message matches'
            : null;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative border-b border-slate-100 p-3">
                <Search className="pointer-events-none absolute top-1/2 left-6 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    autoFocus
                    aria-label="Search this conversation"
                    className="pl-9"
                    placeholder={
                        tab === 'messages'
                            ? 'At least 2 characters'
                            : tab === 'files'
                              ? 'File name (optional)'
                              : 'Part of a link (optional)'
                    }
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                />
            </div>
            <div
                role="tablist"
                aria-label="Search in"
                className="flex border-b border-slate-100 px-3"
            >
                {TABS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.key}
                        onClick={() => switchTab(item.key)}
                        className={cn(
                            '-mb-px min-h-11 flex-1 border-b-2 px-3 text-xs font-bold transition-colors',
                            tab === item.key
                                ? 'border-brand text-brand-600'
                                : 'border-transparent text-slate-500 hover:text-slate-900',
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {!ready ? (
                    <EmptyState title="Search this conversation" />
                ) : isFetching && items.length === 0 ? (
                    <div className="space-y-2 p-3">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                ) : isError && items.length === 0 ? (
                    <EmptyState
                        title="Search failed"
                        description="Try again in a moment."
                    />
                ) : empty ? (
                    <EmptyState title={empty} />
                ) : (
                    <>
                        <ul className="divide-y divide-slate-100">
                            {tab === 'messages'
                                ? items.map((message) => (
                                      <li key={message.id}>
                                          <button
                                              type="button"
                                              className="block min-h-14 w-full px-4 py-3 text-left hover:bg-slate-50"
                                              onClick={() => onPick(message.id)}
                                          >
                                              <p className="text-xs text-slate-500">
                                                  {message.sender.name} ·{' '}
                                                  {formatDateTime(
                                                      message.created_at,
                                                  )}
                                              </p>
                                              <p className="line-clamp-2 text-sm text-slate-900">
                                                  {message.body ??
                                                      message.attachments[0]
                                                          ?.original_name}
                                              </p>
                                          </button>
                                      </li>
                                  ))
                                : tab === 'files'
                                  ? items.flatMap((message) =>
                                        message.attachments.map((file) => (
                                            <li
                                                key={`${message.id}-${file.id}`}
                                            >
                                                <button
                                                    type="button"
                                                    className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                                                    onClick={() =>
                                                        onPick(message.id)
                                                    }
                                                >
                                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                                        {isVoice(file) ? (
                                                            <Mic className="size-5" />
                                                        ) : (
                                                            <FileText className="size-5" />
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-bold text-slate-900">
                                                            {file.original_name}
                                                        </span>
                                                        <span className="block text-xs text-slate-500">
                                                            {formatBytes(
                                                                file.size,
                                                            )}{' '}
                                                            ·{' '}
                                                            {
                                                                message.sender
                                                                    .name
                                                            }{' '}
                                                            ·{' '}
                                                            {formatDateTime(
                                                                message.created_at,
                                                            )}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        )),
                                    )
                                  : links.map(({ message, url }, index) => (
                                        <li
                                            key={`${message.id}-${index}`}
                                            className="flex items-center gap-3 px-4 py-3"
                                        >
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                                <Link2 className="size-5" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-sm font-bold text-slate-900 hover:underline"
                                                >
                                                    <span className="truncate">
                                                        {hostOf(url)}
                                                    </span>
                                                    <ExternalLink className="size-3 shrink-0 text-slate-400" />
                                                </a>
                                                <span className="block truncate text-xs text-brand-600">
                                                    {url}
                                                </span>
                                                <span className="block text-xs text-slate-500">
                                                    {message.sender.name} ·{' '}
                                                    {formatDateTime(
                                                        message.created_at,
                                                    )}
                                                </span>
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Show in chat"
                                                title="Show in chat"
                                                onClick={() =>
                                                    onPick(message.id)
                                                }
                                            >
                                                <CornerDownRight className="size-4" />
                                            </Button>
                                        </li>
                                    ))}
                        </ul>
                        {hasMore ? (
                            <div className="flex justify-center p-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    loading={isFetching}
                                    onClick={() => void more()}
                                >
                                    Load more
                                </Button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
