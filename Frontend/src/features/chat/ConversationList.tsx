import {
    Archive,
    ArrowLeft,
    BellOff,
    MoreHorizontal,
    Pencil,
    Pin,
    Plus,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import type { ConversationItem } from '@/api/chat-types';
import {
    useDeleteFolderMutation,
    useGetFoldersQuery,
} from '@/api/endpoints/chat';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

import { ChatAvatar } from './ChatAvatar';
import { ConversationMenu } from './ConversationMenu';
import { FolderNameDialog, type FolderDialogTarget } from './FolderNameDialog';
import { conversationTitle, isVoice } from './messageText';

function preview(item: ConversationItem): string {
    const latest = item.latest_message;

    if (!latest) {
        return 'No messages yet';
    }

    if (latest.attachments.length > 0 && !latest.body) {
        return isVoice(latest.attachments[0])
            ? '🎤 Voice message'
            : `Attachment: ${latest.attachments[0].original_name}`;
    }

    return latest.body ?? '';
}

function shortTime(value: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    return date.toDateString() === new Date().toDateString()
        ? date.toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
          })
        : formatDate(value);
}

export function ConversationList({
    conversations,
    activeId,
    loading,
    error,
    canStart,
    onNew,
    onRetry,
}: {
    conversations: ConversationItem[] | undefined;
    activeId: number | null;
    loading: boolean;
    error: boolean;
    canStart: boolean;
    onNew: () => void;
    onRetry: () => void;
}) {
    const [query, setQuery] = useState('');
    const { data: folderData } = useGetFoldersQuery();
    const [removeFolder, removing] = useDeleteFolderMutation();
    const folders = useMemo(() => folderData ?? [], [folderData]);
    // `null` is the "All" tab.
    const [folderId, setFolderId] = useState<number | null>(null);
    const [menuFor, setMenuFor] = useState<number | null>(null);
    const [dialog, setDialog] = useState<FolderDialogTarget | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const archivedCount = (conversations ?? []).filter(
        (item) => item.is_archived,
    ).length;
    const folder = folders.find((item) => item.id === folderId) ?? null;

    // Folder badges add up the unread messages of the chats inside the folder.
    const unreadIn = useMemo(() => {
        const byChat = new Map(
            (conversations ?? [])
                .filter((item) => !item.is_archived)
                .map((item) => [item.id, item.unread_count]),
        );
        const total = (ids: number[]) =>
            ids.reduce((sum, id) => sum + (byChat.get(id) ?? 0), 0);

        return {
            all: total([...byChat.keys()]),
            folder: new Map(
                folders.map((item) => [item.id, total(item.conversation_ids)]),
            ),
        };
    }, [conversations, folders]);

    const shown = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const inFolder = folder ? new Set(folder.conversation_ids) : null;

        // Pinned chats first (in the order they were pinned), then "Saved Messages",
        // then the rest in the server's order.
        const rank = (item: ConversationItem) =>
            item.pinned_at ? 0 : item.type === 'saved' ? 1 : 2;

        return (conversations ?? [])
            .filter((item) => item.is_archived === showArchived)
            .filter((item) => !inFolder || inFolder.has(item.id))
            .filter(
                (item) =>
                    !needle ||
                    conversationTitle(item).toLowerCase().includes(needle),
            )
            .sort(
                (a, b) =>
                    rank(a) - rank(b) ||
                    (a.pinned_at ?? '').localeCompare(b.pinned_at ?? ''),
            );
    }, [conversations, query, folder, showArchived]);

    const badge = (count: number) =>
        count > 0 ? (
            <span
                aria-label={`${count} unread`}
                className="ml-1.5 rounded-full bg-brand-badge px-1.5 text-[10px] leading-4 font-bold text-on-brand"
            >
                {count > 99 ? '99+' : count}
            </span>
        ) : null;

    const tab = (id: number | null, label: string, count: number) => {
        const selected = id === null ? folder === null : folder?.id === id;

        return (
            <button
                key={id ?? 'all'}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFolderId(id)}
                className={cn(
                    '-mb-px flex min-h-10 shrink-0 items-center border-b-2 px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none',
                    selected
                        ? 'border-brand text-brand-600'
                        : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
            >
                <span className="max-w-28 truncate">{label}</span>
                {badge(count)}
            </button>
        );
    };

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 p-3">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        density="compact"
                        className="pl-9"
                        placeholder="Search chats"
                        aria-label="Search chats"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </div>
            </div>
            {showArchived ? (
                <button
                    type="button"
                    onClick={() => setShowArchived(false)}
                    className="flex min-h-11 items-center gap-2 border-b border-slate-100 px-4 text-sm font-bold text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                >
                    <ArrowLeft className="size-4" />
                    Archived chats
                </button>
            ) : null}
            {folders.length > 0 && !showArchived ? (
                <div className="flex items-center border-b border-slate-100 pr-1 pl-1">
                    <div
                        role="tablist"
                        aria-label="Chat folders"
                        className="flex min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
                    >
                        {tab(null, 'All', unreadIn.all)}
                        {folders.map((item) =>
                            tab(
                                item.id,
                                item.name,
                                unreadIn.folder.get(item.id) ?? 0,
                            ),
                        )}
                    </div>
                    {folder ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Folder options"
                                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                                >
                                    <MoreHorizontal className="size-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem
                                    onSelect={() =>
                                        setDialog({
                                            mode: 'rename',
                                            id: folder.id,
                                            name: folder.name,
                                        })
                                    }
                                >
                                    <Pencil className="size-4" />
                                    Rename folder
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    destructive
                                    onSelect={() => setDeleting(true)}
                                >
                                    <Trash2 className="size-4" />
                                    Delete folder
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : null}
                </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {error ? (
                    <ErrorState
                        title="Could not load chats"
                        action={
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onRetry}
                            >
                                Try again
                            </Button>
                        }
                    />
                ) : loading ? (
                    <div className="space-y-3 p-3">
                        {Array.from({ length: 6 }, (_, index) => (
                            <Skeleton key={index} className="h-16 w-full" />
                        ))}
                    </div>
                ) : shown.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={
                            showArchived && !query
                                ? 'No archived chats'
                                : query
                                  ? 'No chat matches'
                                  : folder
                                    ? 'No chats in this folder'
                                    : 'No conversations yet'
                        }
                        description={
                            folder && !query
                                ? 'Use the ⋮ menu on a chat to add it here.'
                                : query || !canStart
                                  ? undefined
                                  : 'Start a chat with a teammate.'
                        }
                    />
                ) : (
                    <ul>
                        {archivedCount > 0 && !showArchived && !query ? (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setShowArchived(true)}
                                    className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <Archive className="size-5" />
                                    </span>
                                    <span className="flex-1 text-sm font-bold text-slate-900">
                                        Archived chats
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {archivedCount}
                                    </span>
                                </button>
                            </li>
                        ) : null}
                        {shown.map((item) => {
                            const title = conversationTitle(item);
                            const active = item.id === activeId;

                            return (
                                <li
                                    key={item.id}
                                    className="group/row relative"
                                    onContextMenu={(event) => {
                                        event.preventDefault();
                                        setMenuFor(item.id);
                                    }}
                                >
                                    <Link
                                        to={`/chat/${item.id}`}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none',
                                            active && 'bg-selected',
                                        )}
                                    >
                                        <ChatAvatar
                                            type={item.type}
                                            name={title}
                                            src={
                                                item.type === 'direct'
                                                    ? item.other_participant_avatar_path
                                                    : item.avatar_path
                                            }
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <p
                                                    className={cn(
                                                        'truncate text-sm',
                                                        item.unread_count > 0
                                                            ? 'font-extrabold text-slate-900'
                                                            : 'font-bold text-slate-900',
                                                    )}
                                                >
                                                    {title}
                                                </p>
                                                <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                                                    {item.muted_until ? (
                                                        <BellOff
                                                            aria-label="Muted"
                                                            className="size-3"
                                                        />
                                                    ) : null}
                                                    {shortTime(
                                                        item.last_message_at,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-xs text-slate-500">
                                                    {item.type !== 'direct' &&
                                                    item.type !== 'saved' &&
                                                    item.latest_message?.sender
                                                        ? `${item.latest_message.sender.name}: `
                                                        : ''}
                                                    {preview(item)}
                                                </p>
                                                {item.unread_count === 0 &&
                                                item.marked_unread ? (
                                                    <span
                                                        aria-label="Marked as unread"
                                                        className="size-2.5 shrink-0 rounded-full bg-brand-badge"
                                                    />
                                                ) : item.unread_count === 0 &&
                                                  item.pinned_at ? (
                                                    <Pin
                                                        aria-label="Pinned"
                                                        className="size-3.5 shrink-0 -rotate-45 text-slate-400"
                                                    />
                                                ) : null}
                                                {item.unread_count > 0 ? (
                                                    <span
                                                        aria-label={`${item.unread_count} unread`}
                                                        className={cn(
                                                            'shrink-0 rounded-full px-1.5 text-[10px] leading-4 font-bold text-on-brand',
                                                            item.muted_until
                                                                ? 'bg-slate-400'
                                                                : item.has_unread_mention
                                                                  ? 'bg-red-600'
                                                                  : 'bg-brand-badge',
                                                        )}
                                                    >
                                                        {item.has_unread_mention
                                                            ? '@ '
                                                            : ''}
                                                        {item.unread_count > 99
                                                            ? '99+'
                                                            : item.unread_count}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </Link>
                                    <ConversationMenu
                                        item={item}
                                        active={active}
                                        folders={folders}
                                        open={menuFor === item.id}
                                        onOpenChange={(open) =>
                                            setMenuFor(open ? item.id : null)
                                        }
                                        onNewFolder={() =>
                                            setDialog({
                                                mode: 'create',
                                                conversationId: item.id,
                                            })
                                        }
                                    />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            <FolderNameDialog
                target={dialog}
                onClose={() => setDialog(null)}
                onCreated={(id) => setFolderId(id)}
            />
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title="Delete folder?"
                description={`"${folder?.name ?? ''}" will be removed. Your chats stay where they are.`}
                confirmLabel="Delete"
                destructive
                loading={removing.isLoading}
                onConfirm={async () => {
                    if (!folder) {
                        return;
                    }

                    try {
                        await removeFolder(folder.id).unwrap();
                        setFolderId(null);
                        setDeleting(false);
                    } catch (failure) {
                        toast.error(errorMessage(failure));
                    }
                }}
            />
            {canStart ? (
                <Button
                    size="icon"
                    aria-label="New chat"
                    title="New chat"
                    onClick={onNew}
                    className="absolute right-4 bottom-4 z-10 size-14 rounded-full shadow-lg shadow-orange-500/30"
                >
                    <Plus className="size-6" />
                </Button>
            ) : null}
        </div>
    );
}
