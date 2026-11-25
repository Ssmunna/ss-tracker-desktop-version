import { Paperclip } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useAddTicketingNoteMutation,
    useChangeTicketingStatusMutation,
    useGetTicketingTicketQuery,
    useSendTicketingReplyMutation,
} from '@/api/endpoints/ticketing';
import type { TicketStatus, TicketingTicket } from '@/api/ticketing-types';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumb-trail';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateTime } from '@/lib/date';

import { NEXT_STATUSES, formatBytes, label } from './constants';
import { PriorityBadge, StatusBadge } from './shared';

export function TicketingTicketDetailPage() {
    const id = Number(useParams().ticketId);
    const { can } = usePermissions();
    const {
        data: ticket,
        isLoading,
        isError,
        refetch,
    } = useGetTicketingTicketQuery(id);

    if (isError) {
        return (
            <ErrorState
                title="Could not load this ticket"
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

    if (isLoading || !ticket) {
        return <Skeleton className="h-96 rounded-2xl" />;
    }

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Breadcrumbs
                    items={[
                        { label: 'Ticketing', to: '/admin/ticketing' },
                        { label: 'Tickets', to: '/admin/ticketing/tickets' },
                        { label: ticket.ticket_number },
                    ]}
                />
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-extrabold break-words text-slate-900 sm:text-2xl">
                        {ticket.subject}
                    </h1>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                </div>
                <p className="text-xs text-slate-500">
                    {ticket.ticket_number} ·{' '}
                    {ticket.client ? (
                        <Link
                            to={`/admin/ticketing/clients/${ticket.client.id}`}
                            className="font-bold text-brand-600 hover:underline"
                        >
                            {ticket.client.name}
                        </Link>
                    ) : (
                        `Client #${ticket.client_id}`
                    )}{' '}
                    · opened {formatDateTime(ticket.created_at)}
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-4">
                    <Card className="space-y-3">
                        <CardTitle>Message</CardTitle>
                        <p className="text-sm break-words whitespace-pre-wrap text-slate-800">
                            {ticket.message}
                        </p>
                        {ticket.attachments.length > 0 ? (
                            <ul className="space-y-1 border-t border-slate-100 pt-3">
                                {ticket.attachments.map((file, index) => (
                                    <li
                                        key={`${file.name}-${index}`}
                                        className="flex items-center gap-2 text-xs text-slate-600"
                                    >
                                        <Paperclip className="size-3.5" />
                                        {file.name}
                                        <span className="text-slate-400">
                                            {file.mime} ·{' '}
                                            {formatBytes(file.size)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </Card>

                    <Conversation
                        ticket={ticket}
                        canReply={can('ticketing.tickets.reply')}
                    />
                </div>

                <div className="space-y-4">
                    <Card className="space-y-2">
                        <CardTitle>Customer</CardTitle>
                        <p className="text-sm font-bold text-slate-900">
                            {ticket.customer_name}
                        </p>
                        <p className="text-xs break-all text-slate-600">
                            {ticket.customer_email}
                        </p>
                        {ticket.customer_phone ? (
                            <p className="text-xs text-slate-600">
                                {ticket.customer_phone}
                            </p>
                        ) : null}
                        {ticket.metadata ? (
                            <div className="space-y-1 border-t border-slate-100 pt-2">
                                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                                    Extra data from the client
                                </p>
                                <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                                    {JSON.stringify(ticket.metadata, null, 2)}
                                </pre>
                            </div>
                        ) : null}
                    </Card>

                    {can('ticketing.tickets.update') ? (
                        <StatusCard ticket={ticket} />
                    ) : null}

                    <Card className="space-y-3">
                        <CardTitle>History</CardTitle>
                        <ol className="space-y-3">
                            {(ticket.status_timeline ?? []).map(
                                (entry, index) => (
                                    <li key={index} className="text-xs">
                                        <p className="text-slate-900">
                                            {entry.old_status
                                                ? `${label(entry.old_status)} → ${label(entry.new_status)}`
                                                : `Created as ${label(entry.new_status)}`}
                                        </p>
                                        <p className="text-slate-500">
                                            {entry.changed_by_type === 'admin'
                                                ? 'Staff'
                                                : 'System'}{' '}
                                            · {formatDateTime(entry.at)}
                                        </p>
                                        {entry.note ? (
                                            <p className="mt-0.5 text-slate-600 italic">
                                                &ldquo;{entry.note}&rdquo;
                                            </p>
                                        ) : null}
                                    </li>
                                ),
                            )}
                        </ol>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatusCard({ ticket }: { ticket: TicketingTicket }) {
    const next = NEXT_STATUSES[ticket.status];
    const [change, { isLoading }] = useChangeTicketingStatusMutation();
    const [status, setStatus] = useState<string>('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (next.length === 0) {
        return (
            <Card className="space-y-1">
                <CardTitle>Status</CardTitle>
                <p className="text-xs text-slate-600">
                    This ticket is {label(ticket.status).toLowerCase()}; its
                    status can no longer change.
                </p>
            </Card>
        );
    }

    return (
        <Card className="space-y-3">
            <CardTitle>Change status</CardTitle>
            <Field label="Move to" error={error ?? undefined}>
                <Select
                    value={status}
                    onValueChange={setStatus}
                    placeholder="Choose a status"
                    options={next.map((value) => ({
                        value,
                        label: label(value),
                    }))}
                />
            </Field>
            <Field label="Status note" hint="Optional. Saved in the history.">
                <Textarea
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />
            </Field>
            <p className="text-[11px] text-slate-500">
                The client is notified by webhook and, if enabled, the customer
                by email.
            </p>
            <Button
                block
                loading={isLoading}
                disabled={!status}
                onClick={async () => {
                    try {
                        await change({
                            id: ticket.id,
                            status: status as TicketStatus,
                            note: note.trim() || undefined,
                        }).unwrap();
                        toast.success('Status updated.');
                        setStatus('');
                        setNote('');
                        setError(null);
                    } catch (e) {
                        setError(fieldErrors(e).status ?? null);
                        toast.error(errorMessage(e));
                    }
                }}
            >
                Update status
            </Button>
        </Card>
    );
}

function Conversation({
    ticket,
    canReply,
}: {
    ticket: TicketingTicket;
    canReply: boolean;
}) {
    const notes = ticket.notes ?? [];

    return (
        <Card className="space-y-4">
            <CardTitle>Conversation</CardTitle>
            {notes.length === 0 ? (
                <p className="text-xs text-slate-500">
                    No replies or notes yet.
                </p>
            ) : (
                <ul className="space-y-3">
                    {notes.map((note) => (
                        <li
                            key={note.id}
                            className={`rounded-xl p-3 text-sm ${
                                note.type === 'reply'
                                    ? 'bg-brand-50'
                                    : 'border border-dashed border-amber-300 bg-amber-50'
                            }`}
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <Badge
                                    tone={
                                        note.type === 'reply'
                                            ? 'brand'
                                            : 'warning'
                                    }
                                >
                                    {note.type === 'reply'
                                        ? 'Reply to customer'
                                        : 'Internal note'}
                                </Badge>
                                <span className="text-[11px] text-slate-500">
                                    {formatDateTime(note.created_at)}
                                </span>
                            </div>
                            <p className="break-words whitespace-pre-wrap text-slate-800">
                                {note.body}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
            {canReply ? <Composer ticketId={ticket.id} /> : null}
        </Card>
    );
}

function Composer({ ticketId }: { ticketId: number }) {
    const [sendReply, reply] = useSendTicketingReplyMutation();
    const [addNote, noteState] = useAddTicketingNoteMutation();
    const [mode, setMode] = useState<'reply' | 'note'>('reply');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | undefined>();

    const submit = async () => {
        try {
            if (mode === 'reply') {
                await sendReply({ id: ticketId, body }).unwrap();
                toast.success('Reply sent.');
            } else {
                await addNote({ id: ticketId, body }).unwrap();
                toast.success('Note added.');
            }
            setBody('');
            setError(undefined);
        } catch (e) {
            setError(fieldErrors(e).body);

            if (!fieldErrors(e).body) {
                toast.error(errorMessage(e));
            }
        }
    };

    return (
        <div className="space-y-3 border-t border-slate-100 pt-4">
            <Tabs
                value={mode}
                onValueChange={(value) => setMode(value as 'reply' | 'note')}
            >
                <TabsList>
                    <TabsTrigger value="reply">Reply to customer</TabsTrigger>
                    <TabsTrigger value="note">Internal note</TabsTrigger>
                </TabsList>
                <TabsContent
                    value="reply"
                    className="text-[11px] text-slate-500"
                >
                    The customer is emailed this reply if the client has email
                    notifications on.
                </TabsContent>
                <TabsContent
                    value="note"
                    className="text-[11px] text-slate-500"
                >
                    Only your team sees internal notes.
                </TabsContent>
            </Tabs>
            <Field label={mode === 'reply' ? 'Reply' : 'Note'} error={error}>
                <Textarea
                    rows={4}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                />
            </Field>
            <Button
                loading={reply.isLoading || noteState.isLoading}
                disabled={body.trim() === ''}
                onClick={() => void submit()}
            >
                {mode === 'reply' ? 'Send reply' : 'Add note'}
            </Button>
        </div>
    );
}
