import { ArrowLeft, Info, Palette, Pin, Search, X } from 'lucide-react';
import {
    Fragment,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import type { ChatMessage, ConversationDetail } from '@/api/chat-types';
import {
    chatApi,
    useDeleteMessageMutation,
    useEditMessageMutation,
    useGetConversationQuery,
    useGetReadersQuery,
    useLazyGetMessagesFromQuery,
    useLazyGetOlderMessagesQuery,
    useMarkReadMutation,
    usePinMessageMutation,
    useToggleReactionMutation,
    useUnpinMessageMutation,
} from '@/api/endpoints/chat';
import { useAppDispatch } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import * as patch from './cache';
import { Composer } from './Composer';
import { ChatAvatar } from './ChatAvatar';
import { GroupInfoPanel } from './GroupInfoPanel';
import { MessageBubble, type BubbleActions } from './MessageBubble';
import { conversationTitle } from './messageText';
import { SearchPanel } from './SearchPanel';
import { useConversationChannel } from './useChatRealtime';
import { useEcho } from './echoState';
import { useWallpaper } from './useWallpaper';
import { WallpaperDialog } from './WallpaperDialog';
import { wallpaperClass } from './wallpapers';

const dayLabel = (value: string | null) =>
    value
        ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : '';

export function Thread({
    conversationId,
    self,
}: {
    conversationId: number;
    self: { id: number; name: string; isClient: boolean };
}) {
    const dispatch = useAppDispatch();
    const echo = useEcho();
    const [wallpaper, setWallpaper] = useWallpaper(self.id);
    const [pickingWallpaper, setPickingWallpaper] = useState(false);
    const { data, isLoading, isError, refetch } =
        useGetConversationQuery(conversationId);
    const { typing, whisper } = useConversationChannel(
        echo,
        conversationId,
        self.id,
    );
    const [loadOlder, older] = useLazyGetOlderMessagesQuery();
    const [loadFrom] = useLazyGetMessagesFromQuery();
    const [markRead] = useMarkReadMutation();
    const [toggle] = useToggleReactionMutation();
    const [edit, { isLoading: editing }] = useEditMessageMutation();
    const [remove, { isLoading: removing }] = useDeleteMessageMutation();
    const [pin] = usePinMessageMutation();
    const [unpin] = useUnpinMessageMutation();
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
    const [editText, setEditText] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
    const [pinTarget, setPinTarget] = useState<ChatMessage | null>(null);
    const [readersOf, setReadersOf] = useState<ChatMessage | null>(null);
    const [panel, setPanel] = useState<'info' | 'search' | null>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const stick = useRef(true);
    const heightBefore = useRef<number | null>(null);
    const lastTyped = useRef(0);

    const update = useCallback(
        (recipe: (draft: ConversationDetail) => void) =>
            dispatch(
                chatApi.util.updateQueryData(
                    'getConversation',
                    conversationId,
                    recipe,
                ),
            ),
        [dispatch, conversationId],
    );

    const count = data?.messages.length ?? 0;
    const lastId = data?.messages[count - 1]?.id;
    const lastFromOther = data?.messages[count - 1]?.sender.id !== self.id;

    // Keep the newest message in view, unless the reader scrolled up to older ones.
    useLayoutEffect(() => {
        const node = scroller.current;

        if (!node) {
            return;
        }

        if (heightBefore.current !== null) {
            node.scrollTop = node.scrollHeight - heightBefore.current;
            heightBefore.current = null;
        } else if (stick.current) {
            node.scrollTop = node.scrollHeight;
        }
    }, [lastId, count, typing.length]);

    // A new message from someone else while this chat is open counts as read.
    useEffect(() => {
        if (lastId && lastFromOther && document.visibilityState === 'visible') {
            void markRead(conversationId);
        }
    }, [lastId, lastFromOther, conversationId, markRead]);

    const loadEarlier = async () => {
        const first = data?.messages[0];

        if (!first || older.isFetching) {
            return;
        }

        heightBefore.current = scroller.current?.scrollHeight ?? null;

        try {
            const page = await loadOlder({
                id: conversationId,
                before: first.id,
            }).unwrap();
            update((draft) =>
                patch.prependMessages(draft, page.messages, page.has_more),
            );
        } catch (error) {
            heightBefore.current = null;
            toast.error(errorMessage(error));
        }
    };

    const jump = async (messageId: number) => {
        const target = document.getElementById(`message-${messageId}`);

        if (!target) {
            try {
                const page = await loadFrom({
                    id: conversationId,
                    from: messageId,
                }).unwrap();
                update((draft) =>
                    patch.prependMessages(draft, page.messages, draft.has_more),
                );
            } catch (error) {
                toast.error(errorMessage(error));

                return;
            }
        }

        window.setTimeout(() => {
            const node = document.getElementById(`message-${messageId}`);
            stick.current = false;
            node?.scrollIntoView({ block: 'center' });
            node?.classList.add('bg-brand-50');
            window.setTimeout(
                () => node?.classList.remove('bg-brand-50'),
                1500,
            );
        }, 50);
    };

    const actions: BubbleActions = {
        reply: setReplyTo,
        edit: (message) => {
            setEditTarget(message);
            setEditText(message.body ?? '');
        },
        remove: setDeleteTarget,
        pin: setPinTarget,
        readers: setReadersOf,
        jump: (id) => void jump(id),
        react: async (message, emoji) => {
            try {
                const result = await toggle({ id: message.id, emoji }).unwrap();
                update((draft) =>
                    patch.reactionsUpdated(draft, message.id, result.reactions),
                );
            } catch (error) {
                toast.error(errorMessage(error));
            }
        },
    };

    if (isError) {
        return (
            <ErrorState
                title="Could not open this conversation"
                action={
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                    >
                        Try again
                    </Button>
                }
            />
        );
    }

    if (isLoading || !data) {
        return (
            <div className="space-y-3 p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-2/3" />
                <Skeleton className="ml-auto h-16 w-2/3" />
            </div>
        );
    }

    const other = data.participants.find((item) => item.user_id !== self.id);
    const title = conversationTitle({
        ...data.conversation,
        other_participant_name: other?.user?.name ?? null,
    });
    const mine = data.participants.find((item) => item.user_id === self.id);
    const pins = data.pins;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex min-h-14 items-center gap-2 border-b border-slate-100 px-2 sm:px-4">
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Back to chats"
                >
                    <Link to="/chat">
                        <ArrowLeft className="size-5" />
                    </Link>
                </Button>
                <ChatAvatar
                    type={data.conversation.type}
                    name={title}
                    src={
                        data.conversation.type === 'direct'
                            ? other?.user?.avatar_path
                            : data.conversation.avatar_path
                    }
                    size="sm"
                />
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-sm font-bold text-slate-900">
                        {title}
                    </h1>
                    <p className="truncate text-[11px] text-slate-500">
                        {data.conversation.type === 'saved'
                            ? 'Notes, links and files for yourself'
                            : typing.length > 0
                              ? `${typing.join(', ')} typing…`
                              : `${data.participants.filter((item) => !item.left_at).length} member(s)`}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Chat wallpaper"
                    onClick={() => setPickingWallpaper(true)}
                >
                    <Palette className="size-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Search in conversation"
                    onClick={() => setPanel('search')}
                >
                    <Search className="size-5" />
                </Button>
                {data.conversation.type !== 'saved' ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Conversation info"
                        onClick={() => setPanel('info')}
                    >
                        <Info className="size-5" />
                    </Button>
                ) : null}
            </header>

            {pins.length > 0 ? (
                <div className="flex items-center gap-2 border-b border-slate-100 bg-brand-50 px-4 py-2 text-xs">
                    <Pin className="size-3.5 shrink-0 text-brand-600" />
                    <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => void jump(pins[0].message_id)}
                    >
                        <span className="font-bold">
                            {pins[0].message.sender.name}:{' '}
                        </span>
                        {pins[0].message.body ??
                            pins[0].message.attachment_name ??
                            'Attachment'}
                        {pins.length > 1 ? (
                            <span className="ml-1 text-slate-500">
                                +{pins.length - 1} more
                            </span>
                        ) : null}
                    </button>
                    <button
                        type="button"
                        aria-label="Unpin"
                        className="flex size-8 items-center justify-center rounded-lg hover:bg-white/70"
                        onClick={async () => {
                            try {
                                await unpin({
                                    id: pins[0].message_id,
                                    scope: pins[0].scope,
                                }).unwrap();
                                update((draft) => {
                                    draft.pins = draft.pins.filter(
                                        (item) => item.id !== pins[0].id,
                                    );
                                });
                            } catch (error) {
                                toast.error(errorMessage(error));
                            }
                        }}
                    >
                        <X className="size-4" />
                    </button>
                </div>
            ) : null}

            <div
                ref={scroller}
                className={cn(
                    'min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto px-3 py-4 sm:px-6',
                    wallpaperClass(wallpaper),
                )}
                onScroll={(event) => {
                    const node = event.currentTarget;
                    stick.current =
                        node.scrollHeight - node.scrollTop - node.clientHeight <
                        120;
                }}
            >
                {data.has_more ? (
                    <div className="mb-4 text-center">
                        <Button
                            size="sm"
                            variant="outline"
                            loading={older.isFetching}
                            onClick={() => void loadEarlier()}
                        >
                            Load earlier messages
                        </Button>
                    </div>
                ) : null}
                {data.messages.length === 0 ? (
                    <EmptyState
                        title={
                            data.conversation.type === 'saved'
                                ? 'Nothing saved yet'
                                : 'No messages yet'
                        }
                        description={
                            data.conversation.type === 'saved'
                                ? 'Send yourself notes, links, files or voice messages. Only you can see them.'
                                : 'Say hello.'
                        }
                    />
                ) : (
                    <ul className="flex flex-col gap-1" aria-label="Messages">
                        {data.messages.map((message, index) => {
                            const previous = data.messages[index - 1];
                            const newDay =
                                dayLabel(message.created_at) !==
                                dayLabel(previous?.created_at ?? null);
                            const sameSender =
                                previous &&
                                previous.sender.id === message.sender.id &&
                                !newDay;
                            const seen =
                                message.sender.id === self.id &&
                                patch.readByOthers(data, message) > 0;

                            return (
                                <Fragment key={message.id}>
                                    {newDay ? (
                                        <li className="py-2 text-center">
                                            <span className="rounded-full bg-white/75 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 shadow-[0_1px_2px_rgba(38,53,68,0.08)]">
                                                {dayLabel(message.created_at)}
                                            </span>
                                        </li>
                                    ) : null}
                                    <MessageBubble
                                        message={message}
                                        selfId={self.id}
                                        seen={seen}
                                        groupStart={!sameSender}
                                        showSender={
                                            data.conversation.type !==
                                                'direct' && !sameSender
                                        }
                                        actions={actions}
                                    />
                                </Fragment>
                            );
                        })}
                    </ul>
                )}
            </div>

            {mine && !mine.left_at ? (
                <Composer
                    conversationId={conversationId}
                    members={data.participants}
                    selfId={self.id}
                    replyTo={replyTo}
                    onClearReply={() => setReplyTo(null)}
                    onTyping={() => {
                        const now = Date.now();

                        if (now - lastTyped.current > 1500) {
                            lastTyped.current = now;
                            whisper({ id: self.id, name: self.name });
                        }
                    }}
                    onSent={(message) => {
                        stick.current = true;
                        update((draft) => patch.messageSent(draft, message));
                    }}
                />
            ) : (
                <p className="border-t border-slate-100 p-4 text-center text-sm text-slate-500">
                    You are no longer in this conversation.
                </p>
            )}

            <Drawer
                open={panel === 'info'}
                onOpenChange={(open) => !open && setPanel(null)}
            >
                <DrawerContent
                    title="Conversation info"
                    className="sm:max-w-sm"
                >
                    <GroupInfoPanel
                        detail={data}
                        selfId={self.id}
                        onClose={() => setPanel(null)}
                    />
                </DrawerContent>
            </Drawer>
            <Drawer
                open={panel === 'search'}
                onOpenChange={(open) => !open && setPanel(null)}
            >
                <DrawerContent title="Search messages" className="sm:max-w-sm">
                    <SearchPanel
                        conversationId={conversationId}
                        onPick={(id) => {
                            setPanel(null);
                            void jump(id);
                        }}
                    />
                </DrawerContent>
            </Drawer>

            <Modal
                open={editTarget !== null}
                onOpenChange={(open) => !open && setEditTarget(null)}
            >
                {editTarget ? (
                    <ModalContent
                        title="Edit message"
                        footer={
                            <>
                                <ModalClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </ModalClose>
                                <Button
                                    loading={editing}
                                    disabled={!editText.trim()}
                                    onClick={async () => {
                                        try {
                                            const result = await edit({
                                                id: editTarget.id,
                                                body: editText.trim(),
                                            }).unwrap();
                                            update((draft) =>
                                                patch.messageUpdated(
                                                    draft,
                                                    result.message,
                                                ),
                                            );
                                            setEditTarget(null);
                                        } catch (error) {
                                            toast.error(errorMessage(error));
                                        }
                                    }}
                                >
                                    Save
                                </Button>
                            </>
                        }
                    >
                        <Textarea
                            aria-label="Message text"
                            rows={4}
                            maxLength={10000}
                            value={editText}
                            onChange={(event) =>
                                setEditText(event.target.value)
                            }
                        />
                    </ModalContent>
                ) : null}
            </Modal>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                destructive
                title="Delete message?"
                description="It will be removed for everyone in this conversation."
                confirmLabel="Delete"
                loading={removing}
                onConfirm={async () => {
                    if (!deleteTarget) {
                        return;
                    }

                    try {
                        await remove(deleteTarget.id).unwrap();
                        update((draft) =>
                            patch.messageDeleted(draft, deleteTarget.id),
                        );
                        setDeleteTarget(null);
                    } catch (error) {
                        toast.error(errorMessage(error));
                    }
                }}
            />

            <Modal
                open={pinTarget !== null}
                onOpenChange={(open) => !open && setPinTarget(null)}
            >
                {pinTarget ? (
                    <ModalContent
                        title="Pin message"
                        description="Choose who sees the pin."
                        footer={
                            <ModalClose asChild>
                                <Button variant="secondary">Cancel</Button>
                            </ModalClose>
                        }
                    >
                        <div className="space-y-2 pt-1">
                            {(['me', 'everyone'] as const).map((scope) => (
                                <Button
                                    key={scope}
                                    variant="outline"
                                    block
                                    onClick={async () => {
                                        try {
                                            const result = await pin({
                                                id: pinTarget.id,
                                                scope,
                                            }).unwrap();
                                            update((draft) =>
                                                patch.messagePinned(
                                                    draft,
                                                    result.pin,
                                                ),
                                            );
                                            setPinTarget(null);
                                        } catch (error) {
                                            toast.error(errorMessage(error));
                                        }
                                    }}
                                >
                                    {scope === 'me'
                                        ? 'Only me'
                                        : 'Everyone in the chat'}
                                </Button>
                            ))}
                        </div>
                    </ModalContent>
                ) : null}
            </Modal>

            <Modal
                open={readersOf !== null}
                onOpenChange={(open) => !open && setReadersOf(null)}
            >
                {readersOf ? <ReadersDialog id={readersOf.id} /> : null}
            </Modal>

            <WallpaperDialog
                open={pickingWallpaper}
                onOpenChange={setPickingWallpaper}
                value={wallpaper}
                onChange={setWallpaper}
            />
        </div>
    );
}

function ReadersDialog({ id }: { id: number }) {
    const { data, isLoading } = useGetReadersQuery(id);

    return (
        <ModalContent
            title="Seen by"
            footer={
                <ModalClose asChild>
                    <Button variant="secondary">Close</Button>
                </ModalClose>
            }
        >
            {isLoading || !data ? (
                <Skeleton className="h-16 w-full" />
            ) : data.readers.length === 0 ? (
                <p className="text-sm text-slate-500">
                    Nobody has seen this yet.
                </p>
            ) : (
                <div className="space-y-2">
                    <p className={cn('text-xs text-slate-500')}>
                        {data.readers.length} of {data.total}
                    </p>
                    <ul className="space-y-1">
                        {data.readers.map((reader) => (
                            <li
                                key={reader.id}
                                className="text-sm text-slate-900"
                            >
                                {reader.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </ModalContent>
    );
}
