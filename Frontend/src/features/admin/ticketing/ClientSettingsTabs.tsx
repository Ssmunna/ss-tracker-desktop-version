import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useDeleteTicketingTemplateMutation,
    useGetTicketingSettingsQuery,
    useGetTicketingTemplatesQuery,
    useSaveTicketingTemplateMutation,
    useUpdateTicketingSettingsMutation,
} from '@/api/endpoints/ticketing';
import type {
    EmailTemplate,
    NotificationSettings,
    TicketStatus,
} from '@/api/ticketing-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';

import { TICKET_STATUSES, label } from './constants';

/** Webhook, sender and the email switch: what the client could also set through the SDK. */
export function NotificationsTab({ clientId }: { clientId: number }) {
    const { data, isError, refetch } = useGetTicketingSettingsQuery(clientId);

    if (isError) {
        return (
            <ErrorState
                title="Could not load settings"
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

    return data ? (
        <NotificationsForm
            // Re-seed the form when the saved values change.
            key={JSON.stringify(data)}
            clientId={clientId}
            settings={data}
        />
    ) : (
        <Skeleton className="h-64 rounded-2xl" />
    );
}

function NotificationsForm({
    clientId,
    settings,
}: {
    clientId: number;
    settings: NotificationSettings;
}) {
    const { can } = usePermissions();
    const editable = can('ticketing.settings.update');
    const [save, { isLoading }] = useUpdateTicketingSettingsMutation();
    const [values, setValues] = useState({
        webhook_url: settings.webhook_url ?? '',
        email_enabled: settings.email_enabled,
        sender_email: settings.sender_email ?? '',
        sender_name: settings.sender_name ?? '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const text = (key: 'webhook_url' | 'sender_email' | 'sender_name') => ({
        value: values[key],
        disabled: !editable,
        onChange: (event: { target: { value: string } }) =>
            setValues((current) => ({ ...current, [key]: event.target.value })),
    });

    return (
        <form
            className="max-w-2xl space-y-5"
            onSubmit={async (event) => {
                event.preventDefault();

                try {
                    await save({
                        id: clientId,
                        webhook_url: values.webhook_url.trim() || null,
                        email_enabled: values.email_enabled,
                        sender_email: values.sender_email.trim() || null,
                        sender_name: values.sender_name.trim() || null,
                    }).unwrap();
                    setErrors({});
                    toast.success('Settings saved.');
                } catch (error) {
                    const fields = fieldErrors(error);
                    setErrors(fields);

                    if (Object.keys(fields).length === 0) {
                        toast.error(errorMessage(error));
                    }
                }
            }}
        >
            <Card className="space-y-4">
                <CardTitle>Webhook</CardTitle>
                <Field
                    label="Webhook URL"
                    error={errors.webhook_url}
                    hint="Receives a signed POST each time a ticket's status changes. Must be a public https:// address. Leave empty for none."
                >
                    <Input
                        type="url"
                        placeholder="https://client.com/webhooks/tickets"
                        {...text('webhook_url')}
                    />
                </Field>
            </Card>
            <Card className="space-y-4">
                <CardTitle>Email to the customer</CardTitle>
                <div className="flex items-center justify-between gap-4">
                    <div className="text-xs">
                        <p className="font-bold text-slate-900">
                            Send status emails
                        </p>
                        <p className="text-slate-500">
                            Emails the ticket&apos;s customer on each status
                            change and on replies.
                        </p>
                    </div>
                    <Switch
                        aria-label="Send status emails"
                        checked={values.email_enabled}
                        disabled={!editable}
                        onCheckedChange={(checked) =>
                            setValues((current) => ({
                                ...current,
                                email_enabled: checked,
                            }))
                        }
                    />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Sender email"
                        error={errors.sender_email}
                        hint="Must be on the client's registered domain."
                    >
                        <Input type="email" {...text('sender_email')} />
                    </Field>
                    <Field label="Sender name" error={errors.sender_name}>
                        <Input {...text('sender_name')} />
                    </Field>
                </div>
                {values.email_enabled && !values.sender_email.trim() ? (
                    <p className="text-xs text-amber-700">
                        Emails are not sent until a sender email is set.
                    </p>
                ) : null}
            </Card>
            {editable ? (
                <Button type="submit" loading={isLoading}>
                    Save settings
                </Button>
            ) : null}
        </form>
    );
}

type Row = { status: TicketStatus | 'default'; template: EmailTemplate | null };

/** One template per status plus a default for all; unset ones fall back, as the row says. */
export function TemplatesTab({ clientId }: { clientId: number }) {
    const { can } = usePermissions();
    const run = useRun();
    const { data, isError, refetch } = useGetTicketingTemplatesQuery(clientId);
    const [editing, setEditing] = useState<Row | null>(null);
    const [removing, setRemoving] = useState<Row | null>(null);
    const [remove] = useDeleteTicketingTemplateMutation();
    const editable = can('ticketing.settings.update');

    if (isError) {
        return (
            <ErrorState
                title="Could not load templates"
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

    if (!data) {
        return <Skeleton className="h-64 rounded-2xl" />;
    }

    const custom = (status: TicketStatus | null) =>
        data.templates.find((t) => t.status === status) ?? null;
    const clientDefault = custom(null);
    const rows: Row[] = [
        { status: 'default', template: clientDefault },
        ...TICKET_STATUSES.map((status) => ({
            status,
            template: custom(status),
        })),
    ];

    return (
        <div className="space-y-3">
            <p className="max-w-2xl text-xs text-slate-600">
                The email a customer gets when their ticket changes status. A
                status without its own template uses the default below, and
                without that the system default.
            </p>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
                {rows.map((row) => (
                    <div
                        key={row.status}
                        className="flex flex-wrap items-center gap-3 p-4"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">
                                {row.status === 'default'
                                    ? 'Default (all statuses)'
                                    : label(row.status)}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {row.template
                                    ? row.template.subject
                                    : row.status === 'default'
                                      ? `System default: ${data.default.subject}`
                                      : clientDefault
                                        ? 'Uses your default template'
                                        : 'Uses the system default'}
                            </p>
                        </div>
                        <Badge tone={row.template ? 'brand' : 'neutral'}>
                            {row.template ? 'Custom' : 'Fallback'}
                        </Badge>
                        {editable ? (
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditing(row)}
                                >
                                    <Pencil className="size-3.5" />{' '}
                                    {row.template ? 'Edit' : 'Customise'}
                                </Button>
                                {row.template ? (
                                    <Button
                                        size="sm"
                                        variant="destructiveSoft"
                                        aria-label={`Remove the ${row.status} template`}
                                        onClick={() => setRemoving(row)}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>

            <Drawer
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DrawerContent title="Email template" className="sm:max-w-lg">
                    {editing ? (
                        <TemplateForm
                            key={editing.status}
                            clientId={clientId}
                            row={editing}
                            fallback={clientDefault ?? data.default}
                            placeholders={data.placeholders}
                            onDone={() => setEditing(null)}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>

            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
                destructive
                title="Remove this template?"
                description="The fallback template will be used instead."
                confirmLabel="Remove"
                onConfirm={async () => {
                    if (
                        removing &&
                        (await run(
                            remove({ id: clientId, status: removing.status }),
                            'Template removed.',
                        ))
                    ) {
                        setRemoving(null);
                    }
                }}
            />
        </div>
    );
}

function TemplateForm({
    clientId,
    row,
    fallback,
    placeholders,
    onDone,
}: {
    clientId: number;
    row: Row;
    fallback: EmailTemplate;
    placeholders: string[];
    onDone: () => void;
}) {
    const [save, { isLoading }] = useSaveTicketingTemplateMutation();
    // Start from what applies today, so "Customise" edits something real.
    const start = row.template ?? fallback;
    const [subject, setSubject] = useState(start.subject);
    const [body, setBody] = useState(start.body);
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={async (event) => {
                event.preventDefault();

                try {
                    await save({
                        id: clientId,
                        status: row.status === 'default' ? null : row.status,
                        subject,
                        body,
                    }).unwrap();
                    toast.success('Template saved.');
                    onDone();
                } catch (error) {
                    const fields = fieldErrors(error);
                    setErrors(fields);

                    if (Object.keys(fields).length === 0) {
                        toast.error(errorMessage(error));
                    }
                }
            }}
        >
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <p className="text-sm font-bold text-slate-900">
                    {row.status === 'default'
                        ? 'Default (all statuses)'
                        : label(row.status)}
                </p>
                <Field label="Subject" required error={errors.subject}>
                    <Input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                    />
                </Field>
                <Field
                    label="Body"
                    required
                    error={errors.body}
                    hint="Plain text, or basic HTML: p, br, b, i, u, ul, ol, li, a. Anything else is removed."
                >
                    <Textarea
                        rows={10}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                    />
                </Field>
                <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-700">
                        Placeholders (click to add to the body)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {placeholders.map((name) => (
                            <button
                                key={name}
                                type="button"
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                                onClick={() =>
                                    setBody(
                                        (current) => `${current}{{${name}}}`,
                                    )
                                }
                            >
                                {`{{${name}}}`}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                        Only these can be used; anything else is rejected.
                    </p>
                </div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-4">
                <Button type="submit" block loading={isLoading}>
                    Save template
                </Button>
            </div>
        </form>
    );
}
