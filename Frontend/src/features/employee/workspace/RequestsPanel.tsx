import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { errorMessage } from '@/api/baseApi';
import type { Priority } from '@/api/employee-types';
import {
    useCreateExtensionMutation,
    useCreateRequestMutation,
    useDeleteExtensionMutation,
    useDeleteRequestMutation,
    useUpdateExtensionMutation,
    useUpdateRequestMutation,
} from '@/api/endpoints/employeeProject';
import type {
    DeadlineExtensionItem,
    ProjectDetail,
    ProjectRequestItem,
} from '@/api/project-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useAppSelector } from '@/app/hooks';
import { selectMe } from '@/features/auth/authSlice';
import { FormMessage } from '@/features/auth/AuthCard';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate, formatDateTime } from '@/lib/date';
import { applyServerErrors } from '@/lib/forms';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { PRIORITIES } from './constants';
import { PriorityBadge, RequestStatusBadge, SectionHeader } from './shared';

const priorityChoices = PRIORITIES.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
}));

/** Change requests the employee raised for the project. Only their own pending ones are editable. */
export function RequestsPanel({
    detail,
    locked,
}: {
    detail: ProjectDetail;
    locked: boolean;
}) {
    const { can } = usePermissions();
    const run = useRun();
    const me = useAppSelector(selectMe)!;
    const projectId = detail.project.id;
    const [editing, setEditing] = useState<ProjectRequestItem | 'new' | null>(
        null,
    );
    const [deleting, setDeleting] = useState<ProjectRequestItem | null>(null);
    const [remove, { isLoading }] = useDeleteRequestMutation();
    const mine = (item: ProjectRequestItem) =>
        item.requested_by?.id === me.developer?.id && item.status === 'pending';

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Change requests"
                description="Ask the admin for a change to scope, links or priority."
                action={
                    can('employee-projects.requests.create') && !locked ? (
                        <Button size="sm" onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> New request
                        </Button>
                    ) : undefined
                }
            />
            {detail.project.requests.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No requests yet" />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {detail.project.requests.map((item) => (
                        <li key={item.id}>
                            <Card className="space-y-2">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 space-y-1">
                                        <p className="text-sm font-bold text-slate-900">
                                            {item.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <RequestStatusBadge
                                                status={item.status}
                                            />
                                            <PriorityBadge
                                                priority={item.priority}
                                            />
                                        </div>
                                    </div>
                                    {mine(item) && !locked ? (
                                        <div className="flex gap-1">
                                            {can(
                                                'employee-projects.requests.update',
                                            ) ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Edit ${item.title}`}
                                                    onClick={() =>
                                                        setEditing(item)
                                                    }
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                            ) : null}
                                            {can(
                                                'employee-projects.requests.delete',
                                            ) ? (
                                                <Button
                                                    variant="destructiveSoft"
                                                    size="icon"
                                                    aria-label={`Delete ${item.title}`}
                                                    onClick={() =>
                                                        setDeleting(item)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                                {item.description ? (
                                    <p className="text-sm whitespace-pre-line text-slate-600">
                                        {item.description}
                                    </p>
                                ) : null}
                                {item.links?.length ? (
                                    <ul className="flex flex-wrap gap-2">
                                        {item.links.map((link) => (
                                            <li key={link}>
                                                <a
                                                    href={link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                                                >
                                                    <ExternalLink className="size-3" />
                                                    {new URL(link).hostname}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                <p className="text-xs text-slate-500">
                                    By {item.requested_by?.name ?? 'Unknown'} ·{' '}
                                    {formatDateTime(item.created_at)}
                                    {item.reviewed_by
                                        ? ` · Reviewed by ${item.reviewed_by.name}`
                                        : ''}
                                    {item.reason ? ` · ${item.reason}` : ''}
                                </p>
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
                    <RequestForm
                        key={editing === 'new' ? 'new' : editing.id}
                        projectId={projectId}
                        phaseId={detail.selected_phase_id}
                        item={editing === 'new' ? null : editing}
                        onDone={() => setEditing(null)}
                    />
                ) : null}
            </Modal>
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete request?"
                description={
                    deleting ? `"${deleting.title}" will be withdrawn.` : ''
                }
                confirmLabel="Delete"
                loading={isLoading}
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(
                            remove({ projectId, requestId: deleting.id }),
                        ))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

const requestSchema = z.object({
    title: z.string().trim().min(1, 'Enter a title.').max(255),
    description: z.string().max(5000),
    links: z.string(),
    priority: z.string(),
});
type RequestValues = z.infer<typeof requestSchema>;

function RequestForm({
    projectId,
    phaseId,
    item,
    onDone,
}: {
    projectId: number;
    phaseId: number | null;
    item: ProjectRequestItem | null;
    onDone: () => void;
}) {
    const [create, { isLoading: creating }] = useCreateRequestMutation();
    const [update, { isLoading: updating }] = useUpdateRequestMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<RequestValues>({
        resolver: zodResolver(
            requestSchema,
        ) as unknown as Resolver<RequestValues>,
        defaultValues: {
            title: item?.title ?? '',
            description: item?.description ?? '',
            links: (item?.links ?? []).join('\n'),
            priority: item?.priority ?? 'normal',
        },
    });

    const onSubmit = async (values: RequestValues) => {
        setFormError(null);
        const links = values.links
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const body = {
            title: values.title,
            description: values.description || null,
            links,
            priority: values.priority as Priority,
        };

        try {
            if (item) {
                await update({ projectId, requestId: item.id, body }).unwrap();
                toast.success('Request updated.');
            } else {
                await create({
                    projectId,
                    body: { ...body, project_phase_id: phaseId },
                }).unwrap();
                toast.success('Request submitted.');
            }

            onDone();
        } catch (error) {
            setFormError(
                applyServerErrors(error, setError, [
                    'title',
                    'description',
                    'priority',
                ]) ?? errorMessage(error),
            );
        }
    };

    return (
        <ModalContent
            title={item ? 'Edit request' : 'New request'}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="request-form"
                        loading={creating || updating}
                    >
                        Submit
                    </Button>
                </>
            }
        >
            <form
                id="request-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4 pt-1"
            >
                <FormMessage>{formError}</FormMessage>
                <Field label="Title" required error={errors.title?.message}>
                    <Input autoFocus {...register('title')} />
                </Field>
                <Field label="Priority">
                    <Controller
                        control={control}
                        name="priority"
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                options={priorityChoices}
                            />
                        )}
                    />
                </Field>
                <Field label="Description" error={errors.description?.message}>
                    <Textarea rows={4} {...register('description')} />
                </Field>
                <Field
                    label="Links"
                    hint="One link per line (https://…)"
                    error={errors.links?.message}
                >
                    <Textarea rows={3} {...register('links')} />
                </Field>
            </form>
        </ModalContent>
    );
}

/** Deadline extension requests. Monthly projects are not eligible (the server refuses them). */
export function ExtensionsPanel({
    detail,
    locked,
}: {
    detail: ProjectDetail;
    locked: boolean;
}) {
    const { t } = usePhaseLabel();
    const { can } = usePermissions();
    const run = useRun();
    const me = useAppSelector(selectMe)!;
    const projectId = detail.project.id;
    const monthly = detail.project.type === 'Monthly';
    const [editing, setEditing] = useState<
        DeadlineExtensionItem | 'new' | null
    >(null);
    const [deleting, setDeleting] = useState<DeadlineExtensionItem | null>(
        null,
    );
    const [remove, { isLoading }] = useDeleteExtensionMutation();
    const mine = (item: DeadlineExtensionItem) =>
        item.requested_by?.id === me.developer?.id && item.status === 'pending';

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Deadline extensions"
                description={
                    monthly
                        ? 'Monthly projects are not eligible for deadline extension requests.'
                        : t('Ask for more time on this phase.')
                }
                action={
                    can('employee-projects.deadline-extensions.create') &&
                    !locked &&
                    !monthly ? (
                        <Button size="sm" onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> Request extension
                        </Button>
                    ) : undefined
                }
            />
            {detail.project.deadline_extensions.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No extension requests" />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {detail.project.deadline_extensions.map((item) => (
                        <li key={item.id}>
                            <Card className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <RequestStatusBadge
                                            status={item.status}
                                        />
                                        <p className="text-sm text-slate-900">
                                            {item.reason}
                                        </p>
                                    </div>
                                    {mine(item) && !locked ? (
                                        <div className="flex gap-1">
                                            {can(
                                                'employee-projects.deadline-extensions.update',
                                            ) && !monthly ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Edit extension request"
                                                    onClick={() =>
                                                        setEditing(item)
                                                    }
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                            ) : null}
                                            {can(
                                                'employee-projects.deadline-extensions.delete',
                                            ) ? (
                                                <Button
                                                    variant="destructiveSoft"
                                                    size="icon"
                                                    aria-label="Delete extension request"
                                                    onClick={() =>
                                                        setDeleting(item)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Current{' '}
                                    {formatDate(item.current_deadline_snapshot)}{' '}
                                    → requested{' '}
                                    {formatDate(item.requested_deadline)}
                                    {item.status === 'approved'
                                        ? ` · approved ${formatDate(item.new_deadline)}`
                                        : ''}
                                    {item.review_note
                                        ? ` · ${item.review_note}`
                                        : ''}
                                </p>
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
                    <ExtensionForm
                        key={editing === 'new' ? 'new' : editing.id}
                        projectId={projectId}
                        phaseId={detail.selected_phase_id}
                        item={editing === 'new' ? null : editing}
                        onDone={() => setEditing(null)}
                    />
                ) : null}
            </Modal>
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete request?"
                description="The extension request will be withdrawn."
                confirmLabel="Delete"
                loading={isLoading}
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(
                            remove({ projectId, extensionId: deleting.id }),
                        ))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

const extensionSchema = z.object({
    reason: z
        .string()
        .trim()
        .min(1, 'Explain why you need more time.')
        .max(5000),
    requested_deadline: z.string(),
});
type ExtensionValues = z.infer<typeof extensionSchema>;

function ExtensionForm({
    projectId,
    phaseId,
    item,
    onDone,
}: {
    projectId: number;
    phaseId: number | null;
    item: DeadlineExtensionItem | null;
    onDone: () => void;
}) {
    const [create, { isLoading: creating }] = useCreateExtensionMutation();
    const [update, { isLoading: updating }] = useUpdateExtensionMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ExtensionValues>({
        resolver: zodResolver(extensionSchema),
        defaultValues: {
            reason: item?.reason ?? '',
            requested_deadline: item?.requested_deadline?.slice(0, 10) ?? '',
        },
    });

    const onSubmit = async (values: ExtensionValues) => {
        setFormError(null);
        const body = {
            reason: values.reason,
            requested_deadline: values.requested_deadline || null,
        };

        try {
            if (item) {
                await update({
                    projectId,
                    extensionId: item.id,
                    body,
                }).unwrap();
                toast.success('Extension request updated.');
            } else {
                await create({
                    projectId,
                    body: { ...body, project_phase_id: phaseId },
                }).unwrap();
                toast.success('Extension request submitted.');
            }

            onDone();
        } catch (error) {
            setFormError(
                applyServerErrors(error, setError, [
                    'reason',
                    'requested_deadline',
                ]) ?? errorMessage(error),
            );
        }
    };

    return (
        <ModalContent
            title={
                item ? 'Edit extension request' : 'Request a deadline extension'
            }
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="extension-form"
                        loading={creating || updating}
                    >
                        Submit
                    </Button>
                </>
            }
        >
            <form
                id="extension-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4 pt-1"
            >
                <FormMessage>{formError}</FormMessage>
                <Field
                    label="Requested deadline"
                    error={errors.requested_deadline?.message}
                >
                    <Input
                        type="date"
                        autoFocus
                        {...register('requested_deadline')}
                    />
                </Field>
                <Field label="Reason" required error={errors.reason?.message}>
                    <Textarea rows={4} {...register('reason')} />
                </Field>
            </form>
        </ModalContent>
    );
}
