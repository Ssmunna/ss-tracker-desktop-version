import { Camera, LogOut, UserMinus, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import type { ConversationDetail } from '@/api/chat-types';
import {
    useAddParticipantMutation,
    useChangeConversationAvatarMutation,
    useGetConversationsQuery,
    useLeaveConversationMutation,
    useRemoveParticipantMutation,
    useRenameConversationMutation,
} from '@/api/endpoints/chat';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRun } from '@/hooks/useRun';
import { assetUrl } from '@/lib/assetUrl';

const LABELS = {
    client: 'Client',
    ceo_squad: "CEO's Squad",
    team: '',
} as const;

/** Members, rename, add, remove and leave. The server decides what each person may do. */
export function GroupInfoPanel({
    detail,
    selfId,
    onClose,
}: {
    detail: ConversationDetail;
    selfId: number;
    onClose: () => void;
}) {
    const run = useRun();
    const navigate = useNavigate();
    const { conversation, participants, is_admin: isAdmin } = detail;
    const managed =
        conversation.type === 'group' || conversation.type === 'project';
    const locked =
        conversation.type === 'client' || conversation.type === 'direct';
    const { data: list } = useGetConversationsQuery();
    const [rename, { isLoading: renaming }] = useRenameConversationMutation();
    const [changeAvatar, { isLoading: uploading }] =
        useChangeConversationAvatarMutation();
    const picker = useRef<HTMLInputElement>(null);
    const [add] = useAddParticipantMutation();
    const [removeMember] = useRemoveParticipantMutation();
    const [leave, { isLoading: leaving }] = useLeaveConversationMutation();
    const [name, setName] = useState(conversation.name ?? '');
    const [adding, setAdding] = useState('');
    const [confirmLeave, setConfirmLeave] = useState(false);
    const active = participants.filter((item) => !item.left_at);
    const candidates = (list?.users ?? []).filter(
        (user) => !active.some((item) => item.user_id === user.id),
    );

    return (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {managed ? (
                <div className="flex flex-col items-center gap-2">
                    <Avatar
                        name={conversation.name ?? ''}
                        src={assetUrl(conversation.avatar_path)}
                        size="lg"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={uploading}
                        onClick={() => picker.current?.click()}
                    >
                        <Camera className="size-4" /> Change photo
                    </Button>
                    <input
                        ref={picker}
                        type="file"
                        hidden
                        accept=".jpg,.jpeg,.png,.webp"
                        aria-label="Group photo"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            event.target.value = '';

                            if (!file) {
                                return;
                            }

                            if (file.size > 2 * 1024 * 1024) {
                                toast.error(
                                    'The photo must be 2 MB or smaller.',
                                );

                                return;
                            }

                            void run(
                                changeAvatar({
                                    id: conversation.id,
                                    name: conversation.name ?? '',
                                    avatar: file,
                                }),
                                'Group photo updated.',
                            );
                        }}
                    />
                </div>
            ) : null}

            {managed && isAdmin ? (
                <form
                    className="space-y-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void run(
                            rename({ id: conversation.id, name }),
                            'Name updated.',
                        );
                    }}
                >
                    <Field label="Name">
                        <Input
                            value={name}
                            maxLength={255}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </Field>
                    <Button
                        type="submit"
                        size="sm"
                        loading={renaming}
                        disabled={!name.trim() || name === conversation.name}
                    >
                        Save name
                    </Button>
                </form>
            ) : null}

            <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900">
                    Members ({active.length})
                </h2>
                <ul className="divide-y divide-slate-100">
                    {active.map((member) => {
                        const label = LABELS[member.label];

                        return (
                            <li
                                key={member.id}
                                className="flex min-h-14 items-center gap-3 py-2"
                            >
                                <Avatar name={member.user?.name} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                        {member.user?.name ?? 'Former member'}
                                        {member.user_id === selfId
                                            ? ' (you)'
                                            : ''}
                                    </p>
                                    <p className="truncate text-[11px] text-slate-500">
                                        {member.user?.developer_code ?? ''}
                                    </p>
                                </div>
                                {member.role === 'admin' ? (
                                    <Badge tone="info">Admin</Badge>
                                ) : null}
                                {label ? <Badge>{label}</Badge> : null}
                                {managed && member.user_id !== selfId ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Remove ${member.user?.name ?? 'member'}`}
                                        onClick={() =>
                                            void run(
                                                removeMember({
                                                    id: conversation.id,
                                                    user_id: member.user_id,
                                                }),
                                                'Member removed.',
                                            )
                                        }
                                    >
                                        <UserMinus className="size-4 text-red-600" />
                                    </Button>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {managed && candidates.length > 0 ? (
                <div className="space-y-2">
                    <Field label="Add a member">
                        <Select
                            value={adding}
                            onValueChange={setAdding}
                            placeholder="Choose a teammate"
                            options={candidates.map((user) => ({
                                value: String(user.id),
                                label: `${user.name} (${user.developer_code})`,
                            }))}
                        />
                    </Field>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={!adding}
                        onClick={async () => {
                            if (
                                await run(
                                    add({
                                        id: conversation.id,
                                        user_id: Number(adding),
                                    }),
                                    'Member added.',
                                )
                            ) {
                                setAdding('');
                            }
                        }}
                    >
                        <UserPlus className="size-4" /> Add
                    </Button>
                </div>
            ) : null}

            {!locked || conversation.type === 'direct' ? (
                conversation.type === 'direct' ? null : (
                    <Button
                        variant="destructiveSoft"
                        block
                        onClick={() => setConfirmLeave(true)}
                    >
                        <LogOut className="size-4" /> Leave conversation
                    </Button>
                )
            ) : null}

            <ConfirmDialog
                open={confirmLeave}
                onOpenChange={setConfirmLeave}
                destructive
                title="Leave this conversation?"
                description="You will stop receiving its messages. Someone can add you back."
                confirmLabel="Leave"
                loading={leaving}
                onConfirm={async () => {
                    try {
                        await leave(conversation.id).unwrap();
                        toast.success('You left the conversation.');
                        onClose();
                        navigate('/chat', { replace: true });
                    } catch (error) {
                        toast.error(errorMessage(error));
                    }
                }}
            />
        </div>
    );
}
