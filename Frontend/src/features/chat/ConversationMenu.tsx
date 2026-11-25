import {
    Archive,
    ArchiveRestore,
    Bell,
    BellOff,
    Check,
    Eraser,
    ExternalLink,
    FolderPlus,
    LogOut,
    MailOpen,
    MessageCircleMore,
    MoreVertical,
    Pin,
    PinOff,
    FolderInput,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import type { ChatFolder, ConversationItem } from '@/api/chat-types';
import {
    useClearHistoryMutation,
    useLeaveConversationMutation,
    useMarkReadMutation,
    useSetFolderMemberMutation,
    useUpdateChatPreferencesMutation,
} from '@/api/endpoints/chat';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MUTE_CHOICES = [
    { value: '1h', label: 'For 1 hour' },
    { value: '8h', label: 'For 8 hours' },
    { value: '2d', label: 'For 2 days' },
    { value: 'forever', label: 'Forever' },
] as const;

/** The Telegram-style menu of one chat row; opens from the ⋮ button or a right-click. */
export function ConversationMenu({
    item,
    folders,
    active,
    open,
    onOpenChange,
    onNewFolder,
}: {
    item: ConversationItem;
    folders: ChatFolder[];
    /** This is the chat that is open, so leaving it must also leave the page. */
    active: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNewFolder: () => void;
}) {
    const navigate = useNavigate();
    const [prefs] = useUpdateChatPreferencesMutation();
    const [markRead] = useMarkReadMutation();
    const [setMember] = useSetFolderMemberMutation();
    const [clear, clearing] = useClearHistoryMutation();
    const [leave, leaving] = useLeaveConversationMutation();
    const [confirm, setConfirm] = useState<'clear' | 'leave' | null>(null);

    const pinned = item.pinned_at !== null;
    const muted = item.muted_until !== null;
    const unread = item.unread_count > 0 || item.marked_unread;
    // Your own notes and client rooms cannot be left.
    const canLeave = item.type !== 'saved' && item.type !== 'client';

    const run = async (work: () => Promise<unknown>) => {
        try {
            await work();
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <>
            <DropdownMenu open={open} onOpenChange={onOpenChange}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label="Chat options"
                        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full text-slate-500 opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-slate-200 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none data-[state=open]:opacity-100"
                    >
                        <MoreVertical className="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60">
                    <DropdownMenuItem
                        onSelect={() =>
                            window.open(
                                `/chat/${item.id}`,
                                '_blank',
                                'noopener,noreferrer',
                            )
                        }
                    >
                        <ExternalLink className="size-4" />
                        Open in new window
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() =>
                            void run(() =>
                                prefs({
                                    id: item.id,
                                    archived: !item.is_archived,
                                }).unwrap(),
                            )
                        }
                    >
                        {item.is_archived ? (
                            <ArchiveRestore className="size-4" />
                        ) : (
                            <Archive className="size-4" />
                        )}
                        {item.is_archived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() =>
                            void run(() =>
                                prefs({
                                    id: item.id,
                                    pinned: !pinned,
                                }).unwrap(),
                            )
                        }
                    >
                        {pinned ? (
                            <PinOff className="size-4" />
                        ) : (
                            <Pin className="size-4" />
                        )}
                        {pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    {muted ? (
                        <DropdownMenuItem
                            onSelect={() =>
                                void run(() =>
                                    prefs({
                                        id: item.id,
                                        muted: 'off',
                                    }).unwrap(),
                                )
                            }
                        >
                            <Bell className="size-4" />
                            Unmute notifications
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <BellOff className="size-4" />
                                Mute notifications
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {MUTE_CHOICES.map((choice) => (
                                    <DropdownMenuItem
                                        key={choice.value}
                                        onSelect={() =>
                                            void run(() =>
                                                prefs({
                                                    id: item.id,
                                                    muted: choice.value,
                                                }).unwrap(),
                                            )
                                        }
                                    >
                                        {choice.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    <DropdownMenuItem
                        onSelect={() =>
                            void run(() =>
                                unread
                                    ? markRead(item.id).unwrap()
                                    : prefs({
                                          id: item.id,
                                          unread: true,
                                      }).unwrap(),
                            )
                        }
                    >
                        {unread ? (
                            <MailOpen className="size-4" />
                        ) : (
                            <MessageCircleMore className="size-4" />
                        )}
                        {unread ? 'Mark as read' : 'Mark as unread'}
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <FolderInput className="size-4" />
                            Add to folder
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {folders.map((folder) => {
                                const member = folder.conversation_ids.includes(
                                    item.id,
                                );

                                return (
                                    <DropdownMenuItem
                                        key={folder.id}
                                        onSelect={() =>
                                            void run(() =>
                                                setMember({
                                                    id: folder.id,
                                                    conversationId: item.id,
                                                    member: !member,
                                                }).unwrap(),
                                            )
                                        }
                                    >
                                        <Check
                                            className={
                                                member
                                                    ? 'size-4'
                                                    : 'size-4 opacity-0'
                                            }
                                        />
                                        <span className="truncate">
                                            {folder.name}
                                        </span>
                                    </DropdownMenuItem>
                                );
                            })}
                            {folders.length > 0 ? (
                                <DropdownMenuSeparator />
                            ) : null}
                            <DropdownMenuItem onSelect={onNewFolder}>
                                <FolderPlus className="size-4" />
                                Create new folder
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onSelect={() => setConfirm('clear')}>
                        <Eraser className="size-4" />
                        Clear history
                    </DropdownMenuItem>
                    {canLeave ? (
                        <DropdownMenuItem
                            destructive
                            onSelect={() => setConfirm('leave')}
                        >
                            <LogOut className="size-4" />
                            Delete and leave
                        </DropdownMenuItem>
                    ) : null}
                </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
                open={confirm === 'clear'}
                onOpenChange={(next) => !next && setConfirm(null)}
                title="Clear history?"
                description="The messages disappear for you only. Other members keep them."
                confirmLabel="Clear"
                destructive
                loading={clearing.isLoading}
                onConfirm={() =>
                    void run(async () => {
                        await clear(item.id).unwrap();
                        setConfirm(null);
                    })
                }
            />
            <ConfirmDialog
                open={confirm === 'leave'}
                onOpenChange={(next) => !next && setConfirm(null)}
                title="Delete and leave?"
                description={
                    item.type === 'direct'
                        ? 'This chat is removed from your list. It comes back if they message you again.'
                        : 'You leave this group and it is removed from your list.'
                }
                confirmLabel="Delete and leave"
                destructive
                loading={leaving.isLoading}
                onConfirm={() =>
                    void run(async () => {
                        await leave(item.id).unwrap();
                        setConfirm(null);

                        if (active) {
                            navigate('/chat');
                        }
                    })
                }
            />
        </>
    );
}
