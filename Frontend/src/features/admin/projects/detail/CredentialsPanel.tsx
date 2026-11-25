import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Eye, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { errorMessage } from '@/api/baseApi';
import type { AdminProjectDetail, Credential } from '@/api/admin-detail-types';
import {
    useCreateCredentialMutation,
    useDeleteCredentialMutation,
    useRevealCredentialMutation,
    useUpdateCredentialMutation,
} from '@/api/endpoints/adminProjectDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { FormMessage } from '@/features/auth/AuthCard';
import { SectionHeader } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';
import { applyServerErrors } from '@/lib/forms';

const TYPES = ['login', 'api_key', 'database', 'ssh', 'other'] as const;
const ENVIRONMENTS = ['development', 'staging', 'production', 'other'] as const;
const label = (value: string) =>
    value.replace('_', ' ').replace(/^\w/, (char) => char.toUpperCase());

/** Secrets are never in the list; "Reveal" fetches one on demand (audited, rate limited). */
export function CredentialsPanel({ detail }: { detail: AdminProjectDetail }) {
    const { can } = usePermissions();
    const run = useRun();
    const projectId = detail.project.id;
    const [editing, setEditing] = useState<Credential | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Credential | null>(null);
    const [revealed, setRevealed] = useState<{
        credential: Credential;
        secret: string;
    } | null>(null);
    const [reveal] = useRevealCredentialMutation();
    const [remove, { isLoading }] = useDeleteCredentialMutation();

    const doReveal = async (credential: Credential) => {
        try {
            const result = await reveal({
                projectId,
                credentialId: credential.id,
            }).unwrap();
            setRevealed({ credential, secret: result.secret });
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Credentials"
                description="Stored encrypted. Revealing a secret is logged."
                action={
                    can('project-credentials.create') ? (
                        <Button size="sm" onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> New credential
                        </Button>
                    ) : undefined
                }
            />
            {detail.credentials.length === 0 ? (
                <Card variant="flush">
                    <EmptyState icon={KeyRound} title="No credentials stored" />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {detail.credentials.map((credential) => (
                        <li key={credential.id}>
                            <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-slate-900">
                                            {credential.label}
                                        </p>
                                        <Badge>
                                            {label(credential.credential_type)}
                                        </Badge>
                                        {credential.environment ? (
                                            <Badge
                                                tone={
                                                    credential.environment ===
                                                    'production'
                                                        ? 'danger'
                                                        : 'info'
                                                }
                                            >
                                                {label(credential.environment)}
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <p className="truncate text-xs text-slate-500">
                                        {[
                                            credential.url_or_host,
                                            credential.username,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ') || 'No host or user'}
                                        {credential.expires_at
                                            ? ` · expires ${formatDate(credential.expires_at)}`
                                            : ''}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            void doReveal(credential)
                                        }
                                    >
                                        <Eye className="size-4" /> Reveal
                                    </Button>
                                    {can('project-credentials.update') ? (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Edit ${credential.label}`}
                                            onClick={() =>
                                                setEditing(credential)
                                            }
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                    ) : null}
                                    {can('project-credentials.delete') ? (
                                        <Button
                                            size="icon"
                                            variant="destructiveSoft"
                                            aria-label={`Delete ${credential.label}`}
                                            onClick={() =>
                                                setDeleting(credential)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    ) : null}
                                </div>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}

            <Modal
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                {editing !== null ? (
                    <CredentialForm
                        key={editing === 'new' ? 'new' : editing.id}
                        projectId={projectId}
                        credential={editing === 'new' ? null : editing}
                        onDone={() => setEditing(null)}
                    />
                ) : null}
            </Modal>
            <Modal
                open={revealed !== null}
                onOpenChange={(open) => !open && setRevealed(null)}
            >
                {revealed ? (
                    <ModalContent
                        title={revealed.credential.label}
                        description="Shown once. Copy it and close this window."
                        footer={
                            <>
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(
                                            revealed.secret,
                                        );
                                        toast.success('Copied.');
                                    }}
                                >
                                    <Copy className="size-4" /> Copy
                                </Button>
                                <ModalClose asChild>
                                    <Button>Close</Button>
                                </ModalClose>
                            </>
                        }
                    >
                        <pre className="mt-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm break-all whitespace-pre-wrap">
                            {revealed.secret}
                        </pre>
                    </ModalContent>
                ) : null}
            </Modal>
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete credential?"
                description={
                    deleting ? `"${deleting.label}" will be removed.` : ''
                }
                confirmLabel="Delete"
                loading={isLoading}
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(
                            remove({ projectId, credentialId: deleting.id }),
                        ))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

const schema = z.object({
    label: z.string().trim().min(1, 'Enter a label.').max(255),
    credential_type: z.string().min(1),
    url_or_host: z.string(),
    username: z.string(),
    secret: z.string(),
    notes: z.string(),
    environment: z.string(),
    expires_at: z.string(),
});
type Values = z.infer<typeof schema>;

function CredentialForm({
    projectId,
    credential,
    onDone,
}: {
    projectId: number;
    credential: Credential | null;
    onDone: () => void;
}) {
    const [create, { isLoading: creating }] = useCreateCredentialMutation();
    const [update, { isLoading: updating }] = useUpdateCredentialMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<Values>({
        resolver: zodResolver(schema) as unknown as Resolver<Values>,
        defaultValues: {
            label: credential?.label ?? '',
            credential_type: credential?.credential_type ?? 'login',
            url_or_host: credential?.url_or_host ?? '',
            username: credential?.username ?? '',
            secret: '',
            notes: '',
            environment: credential?.environment ?? 'none',
            expires_at: credential?.expires_at?.slice(0, 10) ?? '',
        },
    });

    const onSubmit = async (values: Values) => {
        setFormError(null);

        if (!credential && values.secret.trim() === '') {
            setError('secret', { message: 'Enter the secret.' });

            return;
        }

        const body = {
            label: values.label,
            credential_type:
                values.credential_type as Credential['credential_type'],
            url_or_host: values.url_or_host || null,
            username: values.username || null,
            environment:
                values.environment === 'none'
                    ? null
                    : (values.environment as Credential['environment']),
            expires_at: values.expires_at || null,
            ...(values.secret ? { secret: values.secret } : {}),
            ...(values.notes ? { notes: values.notes } : {}),
        };

        try {
            const result = credential
                ? await update({
                      projectId,
                      credentialId: credential.id,
                      body,
                  }).unwrap()
                : await create({ projectId, body }).unwrap();
            toast.success(result.message);
            onDone();
        } catch (error) {
            setFormError(
                applyServerErrors(error, setError, [
                    'label',
                    'credential_type',
                    'url_or_host',
                    'username',
                    'secret',
                    'notes',
                    'environment',
                    'expires_at',
                ]) ?? errorMessage(error),
            );
        }
    };

    return (
        <ModalContent
            size="lg"
            title={credential ? 'Edit credential' : 'New credential'}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="credential-form"
                        loading={creating || updating}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <form
                id="credential-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4 pt-1"
            >
                <FormMessage>{formError}</FormMessage>
                <Field label="Label" required error={errors.label?.message}>
                    <Input autoFocus {...register('label')} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Type">
                        <Controller
                            control={control}
                            name="credential_type"
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={TYPES.map((value) => ({
                                        value,
                                        label: label(value),
                                    }))}
                                />
                            )}
                        />
                    </Field>
                    <Field label="Environment">
                        <Controller
                            control={control}
                            name="environment"
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={[
                                        { value: 'none', label: 'Not set' },
                                        ...ENVIRONMENTS.map((value) => ({
                                            value,
                                            label: label(value),
                                        })),
                                    ]}
                                />
                            )}
                        />
                    </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                        label="URL or host"
                        error={errors.url_or_host?.message}
                    >
                        <Input {...register('url_or_host')} />
                    </Field>
                    <Field label="Username" error={errors.username?.message}>
                        <Input autoComplete="off" {...register('username')} />
                    </Field>
                </div>
                <Field
                    label={credential ? 'New secret' : 'Secret'}
                    required={!credential}
                    hint={
                        credential
                            ? 'Leave empty to keep the current secret.'
                            : undefined
                    }
                    error={errors.secret?.message}
                >
                    <Textarea
                        rows={2}
                        autoComplete="off"
                        {...register('secret')}
                    />
                </Field>
                <Field label="Notes" error={errors.notes?.message}>
                    <Textarea rows={2} {...register('notes')} />
                </Field>
                <Field label="Expires" error={errors.expires_at?.message}>
                    <Input type="date" {...register('expires_at')} />
                </Field>
            </form>
        </ModalContent>
    );
}
