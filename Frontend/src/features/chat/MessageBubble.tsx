import {
    Check,
    CheckCheck,
    Copy,
    Download,
    FileText,
    Loader2,
    Pause,
    Pencil,
    Pin,
    Play,
    Reply,
    Trash2,
} from 'lucide-react';
import {
    memo,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent,
    type ReactNode,
    type TouchEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import type { ChatMessage } from '@/api/chat-types';
import {
    useAttachmentUrlQuery,
    useLazyAttachmentUrlQuery,
} from '@/api/endpoints/chat';
import { saveUrl } from '@/lib/download';
import { cn } from '@/lib/utils';

import { markDownloaded, useDownloaded } from './downloaded';
import { ImageViewer } from './ImageViewer';
import { formatBytes, isVoice, messageText, REACTIONS } from './messageText';

export interface BubbleActions {
    reply: (message: ChatMessage) => void;
    edit: (message: ChatMessage) => void;
    remove: (message: ChatMessage) => void;
    react: (message: ChatMessage, emoji: string) => void;
    pin: (message: ChatMessage) => void;
    readers: (message: ChatMessage) => void;
    jump: (messageId: number) => void;
}

const time = (value: string | null) =>
    value
        ? new Date(value).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
          })
        : '';

/**
 * A file in a message. Images open to look at; every other file downloads straight away.
 * Until it has been downloaded on this device, hovering the icon shows a download arrow.
 */
function Attachment({
    item,
    own,
}: {
    item: ChatMessage['attachments'][number];
    own: boolean;
}) {
    const [load, { isFetching }] = useLazyAttachmentUrlQuery();
    const downloaded = useDownloaded(item.id);
    const [viewing, setViewing] = useState(false);
    const image = (item.mime_type ?? '').startsWith('image/');

    return (
        <>
            <button
                type="button"
                disabled={isFetching}
                onClick={async () => {
                    try {
                        if (image) {
                            setViewing(true);

                            return;
                        }

                        const { url } = await load({
                            id: item.id,
                            download: true,
                        }).unwrap();
                        saveUrl(url, item.original_name);
                        markDownloaded(item.id);
                    } catch {
                        toast.error('Could not open the file.');
                    }
                }}
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-1 py-1 text-left focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none disabled:cursor-wait"
            >
                <span
                    className={cn(
                        'relative flex size-10 shrink-0 items-center justify-center rounded-full',
                        own ? 'bg-white/25' : 'bg-brand text-on-brand',
                    )}
                >
                    {isFetching ? (
                        <Loader2 className="size-5 animate-spin" />
                    ) : (
                        <>
                            <FileText
                                className={cn(
                                    'size-5',
                                    !downloaded &&
                                        !image &&
                                        'group-hover:hidden group-focus-visible:hidden',
                                )}
                            />
                            {!downloaded && !image ? (
                                <Download className="hidden size-5 group-hover:block group-focus-visible:block" />
                            ) : null}
                        </>
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                        {item.original_name}
                    </span>
                    <span className="block text-xs opacity-70">
                        {formatBytes(item.size)}
                    </span>
                </span>
            </button>
            {viewing ? (
                <ImageViewer item={item} onClose={() => setViewing(false)} />
            ) : null}
        </>
    );
}

/** An image or video shown in the message itself. Falls back to the file row if it cannot load. */
function MediaPreview({
    item,
    own,
    kind,
}: {
    item: ChatMessage['attachments'][number];
    own: boolean;
    kind: 'image' | 'video';
}) {
    const { data, isError, refetch } = useAttachmentUrlQuery({ id: item.id });
    const [broken, setBroken] = useState(false);
    const [viewing, setViewing] = useState(false);
    const retried = useRef(false);

    // The storage link expires after a few minutes. An image that loads late (scrolled into view
    // or reloaded) may find it dead, so ask for a new one once before giving up.
    const failed = () => {
        if (retried.current) {
            setBroken(true);

            return;
        }

        retried.current = true;
        void refetch();
    };

    if (isError || broken) {
        return <Attachment item={item} own={own} />;
    }

    if (!data) {
        return (
            <div className="flex h-40 w-64 max-w-full items-center justify-center rounded-xl bg-black/10">
                <Loader2 className="size-5 animate-spin opacity-70" />
            </div>
        );
    }

    if (kind === 'video') {
        return (
            <video
                src={data.url}
                controls
                preload="metadata"
                playsInline
                onError={failed}
                className="max-h-72 w-full max-w-72 rounded-xl bg-black"
            />
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setViewing(true)}
                aria-label={`Open ${item.original_name}`}
                className="block focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
            >
                <img
                    src={data.url}
                    alt={item.original_name}
                    loading="lazy"
                    onError={failed}
                    className="max-h-72 w-full max-w-72 cursor-zoom-in rounded-xl object-cover"
                />
            </button>
            {viewing ? (
                <ImageViewer item={item} onClose={() => setViewing(false)} />
            ) : null}
        </>
    );
}

/** How far a bubble follows the finger, and how far it must go to count as a reply. */
const SWIPE_MAX = 80;
const SWIPE_REPLY = 56;

const clock = (total: number) =>
    `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')}`;

/** A voice message: play or pause, a progress bar and the time. The file loads on first play. */
function VoicePlayer({
    item,
    own,
}: {
    item: ChatMessage['attachments'][number];
    own: boolean;
}) {
    const [load, { isFetching }] = useLazyAttachmentUrlQuery();
    const audio = useRef<HTMLAudioElement>(null);
    const [src, setSrc] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [now, setNow] = useState(0);
    const [length, setLength] = useState(0);

    // A source that was just fetched plays as soon as the element has it.
    useEffect(() => {
        if (src) {
            void audio.current?.play().catch(() => setPlaying(false));
        }
    }, [src]);

    const toggle = async () => {
        if (!src) {
            try {
                const { url } = await load({ id: item.id }).unwrap();
                setSrc(url);
            } catch {
                toast.error('Could not play the voice message.');
            }

            return;
        }

        if (audio.current?.paused) {
            void audio.current.play();
        } else {
            audio.current?.pause();
        }
    };

    const ratio = length > 0 ? Math.min(1, now / length) : 0;

    return (
        <div className="flex min-w-48 items-center gap-2.5 py-1">
            <button
                type="button"
                aria-label={
                    playing ? 'Pause voice message' : 'Play voice message'
                }
                disabled={isFetching}
                onClick={() => void toggle()}
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none',
                    own ? 'bg-white/25' : 'bg-brand text-on-brand',
                )}
            >
                {playing ? (
                    <Pause className="size-4" />
                ) : (
                    <Play className="size-4" />
                )}
            </button>
            <div className="min-w-0 flex-1 space-y-1">
                <div
                    role="progressbar"
                    aria-label="Voice message progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(ratio * 100)}
                    className={cn(
                        'h-1.5 overflow-hidden rounded-full',
                        own ? 'bg-white/30' : 'bg-slate-300',
                    )}
                >
                    <div
                        className={cn(
                            'h-full rounded-full',
                            own ? 'bg-white' : 'bg-brand',
                        )}
                        style={{ width: `${ratio * 100}%` }}
                    />
                </div>
                <p className="text-[10px] opacity-80">
                    {clock(playing || now > 0 ? now : length)}
                </p>
            </div>
            {src ? (
                <audio
                    ref={audio}
                    src={src}
                    preload="auto"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => {
                        setPlaying(false);
                        setNow(0);
                    }}
                    onTimeUpdate={(event) =>
                        setNow(event.currentTarget.currentTime)
                    }
                    onLoadedMetadata={(event) => {
                        const total = event.currentTarget.duration;

                        // Recorded webm files often report Infinity until they have played.
                        if (Number.isFinite(total)) {
                            setLength(total);
                        }
                    }}
                    onDurationChange={(event) => {
                        const total = event.currentTarget.duration;

                        if (Number.isFinite(total)) {
                            setLength(total);
                        }
                    }}
                />
            ) : null}
        </div>
    );
}

/** The Telegram-style menu: quick reactions on top, then the actions. Opens on right-click or long-press. */
function BubbleMenu({
    at,
    message,
    own,
    actions,
    onClose,
}: {
    at: { x: number; y: number };
    message: ChatMessage;
    own: boolean;
    actions: BubbleActions;
    onClose: () => void;
}) {
    const box = useRef<HTMLDivElement>(null);
    const [place, setPlace] = useState({ left: at.x, top: at.y });

    // Keep the menu inside the screen.
    useLayoutEffect(() => {
        const node = box.current;

        if (!node) {
            return;
        }

        const { width, height } = node.getBoundingClientRect();

        setPlace({
            left: Math.max(8, Math.min(at.x, window.innerWidth - width - 8)),
            top: Math.max(8, Math.min(at.y, window.innerHeight - height - 8)),
        });
    }, [at]);

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

    const item = (
        label: string,
        icon: ReactNode,
        run: () => void,
        destructive = false,
    ) => (
        <button
            key={label}
            type="button"
            role="menuitem"
            onClick={() => {
                onClose();
                run();
            }}
            className={cn(
                'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-slate-100',
                destructive ? 'text-red-600 hover:bg-red-50' : 'text-slate-800',
            )}
        >
            {icon}
            {label}
        </button>
    );

    return createPortal(
        <div
            ref={box}
            role="menu"
            style={{ left: place.left, top: place.top }}
            className="fixed z-[60] w-56 animate-fade-in rounded-2xl border border-slate-200 bg-surface p-1.5 shadow-xl"
        >
            <div
                role="group"
                aria-label="Pick a reaction"
                className="mb-1 flex justify-between border-b border-slate-100 px-1 pb-1.5"
            >
                {REACTIONS.slice(0, 6).map((emoji) => (
                    <button
                        key={emoji}
                        type="button"
                        aria-label={`React ${emoji}`}
                        className="flex size-8 items-center justify-center rounded-full text-lg hover:scale-110 hover:bg-slate-100"
                        onClick={() => {
                            onClose();
                            actions.react(message, emoji);
                        }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            {item('Reply', <Reply className="size-4" />, () =>
                actions.reply(message),
            )}
            {message.body
                ? item('Copy text', <Copy className="size-4" />, () => {
                      void navigator.clipboard
                          ?.writeText(message.body ?? '')
                          .then(() => toast.success('Copied'));
                  })
                : null}
            {item('Pin', <Pin className="size-4" />, () =>
                actions.pin(message),
            )}
            {own
                ? item('Seen by', <CheckCheck className="size-4" />, () =>
                      actions.readers(message),
                  )
                : null}
            {own && message.body
                ? item('Edit', <Pencil className="size-4" />, () =>
                      actions.edit(message),
                  )
                : null}
            {own
                ? item(
                      'Delete',
                      <Trash2 className="size-4" />,
                      () => actions.remove(message),
                      true,
                  )
                : null}
        </div>,
        document.body,
    );
}

export const MessageBubble = memo(function MessageBubble({
    message,
    selfId,
    seen,
    showSender,
    groupStart,
    actions,
}: {
    message: ChatMessage;
    selfId: number;
    /** Someone else has read this message (own messages only). */
    seen: boolean;
    showSender: boolean;
    /** First message of a run by the same sender: leaves a larger gap above. */
    groupStart: boolean;
    actions: BubbleActions;
}) {
    const own = message.sender.id === selfId;
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const press = useRef<number | null>(null);
    // Swipe left to reply: how far the bubble has moved, and where the finger started.
    const [shift, setShift] = useState(0);
    const [dragging, setDragging] = useState(false);
    const gesture = useRef<{
        x: number;
        y: number;
        mode: 'h' | 'v' | null;
    } | null>(null);

    const openAt = (x: number, y: number) => setMenu({ x, y });
    const onContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        openAt(event.clientX, event.clientY);
    };
    const cancelPress = () => {
        if (press.current !== null) {
            window.clearTimeout(press.current);
            press.current = null;
        }
    };
    const onTouchStart = (event: TouchEvent) => {
        const touch = event.touches[0];

        gesture.current = { x: touch.clientX, y: touch.clientY, mode: null };
        cancelPress();
        press.current = window.setTimeout(
            () => openAt(touch.clientX, touch.clientY),
            450,
        );
    };

    const onTouchMove = (event: TouchEvent) => {
        const start = gesture.current;

        if (!start) {
            return;
        }

        const touch = event.touches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;

        // The first clear movement decides: sideways is a swipe, up or down is a scroll.
        if (start.mode === null) {
            if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                start.mode = 'h';
                setDragging(true);
            } else if (Math.abs(dy) > 8) {
                start.mode = 'v';
            }

            if (start.mode !== null) {
                cancelPress();
            }
        }

        if (start.mode === 'h') {
            setShift(Math.max(-SWIPE_MAX, Math.min(0, dx)));
        }
    };
    const endTouch = (replyNow: boolean) => {
        cancelPress();

        const swiped = gesture.current?.mode === 'h';

        gesture.current = null;
        setDragging(false);

        if (swiped && replyNow && shift <= -SWIPE_REPLY) {
            navigator.vibrate?.(10);
            actions.reply(message);
        }

        setShift(0);
    };

    if (message.type === 'system') {
        return (
            <li
                className="py-1 text-center text-[11px] text-slate-500"
                id={`message-${message.id}`}
            >
                {message.body}
            </li>
        );
    }

    return (
        <li
            id={`message-${message.id}`}
            className={cn(
                'group relative flex scroll-mt-16 flex-col gap-0.5',
                groupStart && 'mt-2.5',
                own ? 'items-end' : 'items-start',
            )}
        >
            {showSender && !own ? (
                <span className="px-2 text-[11px] font-bold text-slate-600">
                    {message.sender.name}
                    {message.sender.is_client ? (
                        <span className="ml-1 font-normal text-slate-400">
                            Client
                        </span>
                    ) : null}
                </span>
            ) : null}
            <span
                aria-hidden
                style={{
                    opacity: Math.min(1, -shift / SWIPE_REPLY),
                    transform: `translateY(-50%) scale(${0.6 + Math.min(1, -shift / SWIPE_REPLY) * 0.4})`,
                }}
                className="pointer-events-none absolute top-1/2 right-1 flex size-8 items-center justify-center rounded-full bg-slate-200 text-slate-600"
            >
                <Reply className="size-4" />
            </span>
            <div
                style={{
                    transform: shift ? `translateX(${shift}px)` : undefined,
                    transition: dragging ? 'none' : 'transform 180ms ease-out',
                }}
                className={cn(
                    'flex max-w-[85%] touch-pan-y items-end gap-1 sm:max-w-md',
                    own && 'flex-row-reverse',
                )}
            >
                <div
                    onContextMenu={onContextMenu}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={() => endTouch(true)}
                    onTouchCancel={() => endTouch(false)}
                    className={cn(
                        'min-w-0 space-y-1.5 rounded-2xl px-3.5 py-2 text-sm shadow-[0_1px_1px_rgba(0,0,0,0.05)] select-text [-webkit-touch-callout:none]',
                        own
                            ? 'rounded-br-md bg-brand text-on-brand'
                            : 'rounded-bl-md bg-bubble text-slate-900 shadow-[0_1px_2px_rgba(38,53,68,0.12)]',
                    )}
                >
                    {message.reply_to ? (
                        <button
                            type="button"
                            onClick={() =>
                                !message.reply_to?.deleted &&
                                actions.jump(message.reply_to!.id)
                            }
                            className={cn(
                                'block w-full rounded-lg border-l-4 px-2 py-1 text-left text-xs',
                                own
                                    ? 'border-white/70 bg-white/15'
                                    : 'border-brand bg-white/60',
                            )}
                        >
                            <span className="block font-bold">
                                {message.reply_to.sender_name}
                            </span>
                            <span className="line-clamp-2 opacity-80">
                                {message.reply_to.deleted
                                    ? 'Message deleted'
                                    : (message.reply_to.body ??
                                      (message.reply_to.has_attachment
                                          ? 'Attachment'
                                          : ''))}
                            </span>
                        </button>
                    ) : null}
                    {message.body ? (
                        <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">
                            {messageText(
                                message.body,
                                message.mentions.map((item) => item.name),
                                own,
                            )}
                        </p>
                    ) : null}
                    {message.attachments.map((item) => {
                        const mime = item.mime_type ?? '';

                        if (isVoice(item)) {
                            return (
                                <VoicePlayer
                                    key={item.id}
                                    item={item}
                                    own={own}
                                />
                            );
                        }

                        if (mime.startsWith('image/')) {
                            return (
                                <MediaPreview
                                    key={item.id}
                                    item={item}
                                    own={own}
                                    kind="image"
                                />
                            );
                        }

                        if (mime.startsWith('video/')) {
                            return (
                                <MediaPreview
                                    key={item.id}
                                    item={item}
                                    own={own}
                                    kind="video"
                                />
                            );
                        }

                        return (
                            <Attachment key={item.id} item={item} own={own} />
                        );
                    })}
                    <p
                        className={cn(
                            'flex items-center justify-end gap-1 text-[10px]',
                            own ? 'text-white/80' : 'text-slate-500',
                        )}
                    >
                        {message.edited_at ? 'edited · ' : ''}
                        {time(message.created_at)}
                        {own ? (
                            seen ? (
                                <CheckCheck
                                    aria-label="Seen"
                                    className="size-3.5"
                                />
                            ) : (
                                <Check aria-label="Sent" className="size-3.5" />
                            )
                        ) : null}
                    </p>
                </div>
            </div>
            {message.reactions.length > 0 ? (
                <ul
                    className={cn(
                        'flex flex-wrap gap-1 px-1',
                        own && 'justify-end',
                    )}
                >
                    {message.reactions.map((reaction) => {
                        const mine = reaction.user_ids.includes(selfId);
                        const names = reaction.users
                            ?.map((user) => user.name)
                            .join(', ');

                        return (
                            <li key={reaction.emoji}>
                                <button
                                    type="button"
                                    aria-pressed={mine}
                                    title={names}
                                    onClick={() =>
                                        actions.react(message, reaction.emoji)
                                    }
                                    className={cn(
                                        'flex min-h-8 items-center gap-1 rounded-full border px-2 text-xs',
                                        mine
                                            ? 'border-brand bg-brand-50 font-bold'
                                            : 'border-slate-200 bg-surface',
                                    )}
                                >
                                    {reaction.emoji} {reaction.count}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
            {menu ? (
                <BubbleMenu
                    at={menu}
                    message={message}
                    own={own}
                    actions={actions}
                    onClose={() => setMenu(null)}
                />
            ) : null}
        </li>
    );
});
