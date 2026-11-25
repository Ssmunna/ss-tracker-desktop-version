import { Check, ExternalLink, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import type {
    AdminExtension,
    AdminIssue,
    AdminProjectDetail,
    AdminRequest,
} from '@/api/admin-detail-types';
import {
    useDeleteAdminExtensionMutation,
    useDeleteAdminRequestMutation,
    useReviewExtensionMutation,
    useReviewRequestMutation,
    useUpdateAdminIssueMutation,
} from '@/api/endpoints/adminProjectDetail';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
    PriorityBadge,
    RequestStatusBadge,
    SectionHeader,
} from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate, formatDateTime } from '@/lib/date';

/** Change requests from the team. Approve or reject; the note is optional. */
export function RequestsReviewPanel({
    detail,
}: {
    detail: AdminProjectDetail;
}) {
    const { can } = usePermissions();
    const run = useRun();
    const projectId = detail.project.id;
    const [reviewing, setReviewing] = useState<{
        request: AdminRequest;
        status: 'approved' | 'rejected';
    } | null>(null);
    const [deleting, setDeleting] = useState<AdminRequest | null>(null);
    const [remove, { isLoading }] = useDeleteAdminRequestMutation();

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Change requests"
                description="Requests raised by the project team."
            />
            {detail.project_requests.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No requests yet" />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {detail.project_requests.map((item) => (
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
                                    {can('project-requests.update') ? (
                                        <div className="flex flex-wrap gap-2">
                                            {item.status !== 'approved' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setReviewing({
                                                            request: item,
                                                            status: 'approved',
                                                        })
                                                    }
                                                >
                                                    <Check className="size-4 text-emerald-600" />{' '}
                                                    Approve
                                                </Button>
                                            ) : null}
                                            {item.status !== 'rejected' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setReviewing({
                                                            request: item,
                                                            status: 'rejected',
                                                        })
                                                    }
                                                >
                                                    <X className="size-4 text-red-600" />{' '}
                                                    Reject
                                                </Button>
                                            ) : null}
                                            {can('project-requests.delete') ? (
                                                <Button
                                                    size="icon"
                                                    variant="destructiveSoft"
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
                                {item.links.length ? (
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
                                        ? ` · reviewed by ${item.reviewed_by.name}`
                                        : ''}
                                    {item.reason ? ` · ${item.reason}` : ''}
                                </p>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
            <Modal
                open={reviewing !== null}
                onOpenChange={(open) => !open && setReviewing(null)}
            >
                {reviewing ? (
                    <ReviewRequestForm
                        key={reviewing.request.id}
                        projectId={projectId}
                        request={reviewing.request}
                        status={reviewing.status}
                        onDone={() => setReviewing(null)}
                    />
                ) : null}
            </Modal>
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete request?"
                description={
                    deleting ? `"${deleting.title}" will be removed.` : ''
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

function ReviewRequestForm({
    projectId,
    request,
    status,
    onDone,
}: {
    projectId: number;
    request: AdminRequest;
    status: 'approved' | 'rejected';
    onDone: () => void;
}) {
    const [review, { isLoading }] = useReviewRequestMutation();
    const [reason, setReason] = useState('');
    const [date, setDate] = useState('');

    return (
        <ModalContent
            title={status === 'approved' ? 'Approve request' : 'Reject request'}
            description={request.title}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="review-request"
                        variant={
                            status === 'approved' ? 'primary' : 'destructive'
                        }
                        loading={isLoading}
                    >
                        {status === 'approved' ? 'Approve' : 'Reject'}
                    </Button>
                </>
            }
        >
            <form
                id="review-request"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await review({
                            projectId,
                            requestId: request.id,
                            status,
                            reason: reason || undefined,
                            approved_date:
                                status === 'approved' && date
                                    ? date
                                    : undefined,
                        }).unwrap();
                        toast.success(result.message);
                        onDone();
                    } catch (error) {
                        toast.error(errorMessage(error));
                    }
                }}
            >
                {status === 'approved' ? (
                    <Field label="Approved date" hint="Optional">
                        <Input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                        />
                    </Field>
                ) : null}
                <Field label="Note" hint="Optional, shown to the requester">
                    <Textarea
                        rows={3}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                    />
                </Field>
            </form>
        </ModalContent>
    );
}

/** Deadline extensions. Approving needs the new deadline and the extension type (it sets the weight). */
export function ExtensionsReviewPanel({
    detail,
    locked,
}: {
    detail: AdminProjectDetail;
    locked: boolean;
}) {
    const { can } = usePermissions();
    const run = useRun();
    const projectId = detail.project.id;
    const [reviewing, setReviewing] = useState<{
        extension: AdminExtension;
        status: 'approved' | 'rejected';
    } | null>(null);
    const [deleting, setDeleting] = useState<AdminExtension | null>(null);
    const [remove, { isLoading }] = useDeleteAdminExtensionMutation();
    const b = detail.deadline_extensions_breakdown;

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Deadline extensions"
                description={`${b.pending} pending · ${b.approved} approved · ${b.rejected} rejected`}
            />
            {detail.deadline_extensions.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No extension requests" />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {detail.deadline_extensions.map((item) => (
                        <li key={item.id}>
                            <Card className="space-y-2">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <RequestStatusBadge
                                            status={item.status}
                                        />
                                        <p className="text-sm text-slate-900">
                                            {item.reason}
                                        </p>
                                    </div>
                                    {can(
                                        'project-deadline-extensions.update',
                                    ) && !locked ? (
                                        <div className="flex flex-wrap gap-2">
                                            {item.status !== 'approved' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setReviewing({
                                                            extension: item,
                                                            status: 'approved',
                                                        })
                                                    }
                                                >
                                                    <Check className="size-4 text-emerald-600" />{' '}
                                                    Approve
                                                </Button>
                                            ) : null}
                                            {item.status !== 'rejected' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setReviewing({
                                                            extension: item,
                                                            status: 'rejected',
                                                        })
                                                    }
                                                >
                                                    <X className="size-4 text-red-600" />{' '}
                                                    Reject
                                                </Button>
                                            ) : null}
                                            {can(
                                                'project-deadline-extensions.delete',
                                            ) ? (
                                                <Button
                                                    size="icon"
                                                    variant="destructiveSoft"
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
                                    By {item.requested_by?.name ?? 'Unknown'} ·
                                    current{' '}
                                    {formatDate(item.current_deadline_snapshot)}{' '}
                                    → requested{' '}
                                    {formatDate(item.requested_deadline)}
                                    {item.status === 'approved'
                                        ? ` · approved ${formatDate(item.new_deadline)}${item.new_weight !== null ? ` · weight ${item.new_weight}%` : ''}`
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
                open={reviewing !== null}
                onOpenChange={(open) => !open && setReviewing(null)}
            >
                {reviewing ? (
                    <ReviewExtensionForm
                        key={reviewing.extension.id}
                        projectId={projectId}
                        extension={reviewing.extension}
                        status={reviewing.status}
                        onDone={() => setReviewing(null)}
                    />
                ) : null}
            </Modal>
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete request?"
                description="The extension request will be removed."
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

function ReviewExtensionForm({
    projectId,
    extension,
    status,
    onDone,
}: {
    projectId: number;
    extension: AdminExtension;
    status: 'approved' | 'rejected';
    onDone: () => void;
}) {
    const [review, { isLoading }] = useReviewExtensionMutation();
    const [deadline, setDeadline] = useState(
        extension.requested_deadline?.slice(0, 10) ?? '',
    );
    const [type, setType] = useState('Regular');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <ModalContent
            title={
                status === 'approved' ? 'Approve extension' : 'Reject extension'
            }
            description={extension.reason}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="review-extension"
                        variant={
                            status === 'approved' ? 'primary' : 'destructive'
                        }
                        loading={isLoading}
                    >
                        {status === 'approved' ? 'Approve' : 'Reject'}
                    </Button>
                </>
            }
        >
            <form
                id="review-extension"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await review({
                            projectId,
                            extensionId: extension.id,
                            body:
                                status === 'approved'
                                    ? {
                                          status,
                                          new_deadline: deadline,
                                          extension_type: type,
                                          review_note: note || null,
                                      }
                                    : { status, review_note: note || null },
                        }).unwrap();
                        toast.success(result.message);
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
                {status === 'approved' ? (
                    <>
                        <Field
                            label="New deadline"
                            required
                            error={errors.new_deadline}
                        >
                            <Input
                                type="date"
                                value={deadline}
                                onChange={(event) =>
                                    setDeadline(event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Extension type"
                            required
                            error={errors.extension_type}
                            hint="Failed extensions give half the weight."
                        >
                            <Select
                                value={type}
                                onValueChange={setType}
                                options={[
                                    { value: 'Regular', label: 'Regular' },
                                    { value: 'Failed', label: 'Failed' },
                                ]}
                            />
                        </Field>
                    </>
                ) : null}
                <Field label="Note" hint="Optional">
                    <Textarea
                        rows={3}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                    />
                </Field>
            </form>
        </ModalContent>
    );
}

const issueStatuses = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
];

export function FeedbackAdminPanel({ detail }: { detail: AdminProjectDetail }) {
    const { can } = usePermissions();
    const [update] = useUpdateAdminIssueMutation();

    const change = async (issue: AdminIssue, status: string) => {
        try {
            const result = await update({
                projectId: detail.project.id,
                issueId: issue.id,
                status,
            }).unwrap();
            toast.success(result.message);
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Client feedback"
                description="Issues reported by the client."
            />
            {detail.project_issues.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No client feedback yet" />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {detail.project_issues.map((issue) => (
                        <li key={issue.id}>
                            <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <p className="text-sm font-bold text-slate-900">
                                        {issue.title}
                                    </p>
                                    {issue.description ? (
                                        <p className="text-sm whitespace-pre-line text-slate-600">
                                            {issue.description}
                                        </p>
                                    ) : null}
                                    <p className="text-xs text-slate-500">
                                        {issue.client?.name ??
                                            issue.reported_by?.name ??
                                            'Client'}{' '}
                                        · {formatDateTime(issue.created_at)}
                                    </p>
                                </div>
                                <Select
                                    className="sm:w-40"
                                    aria-label={`Status for ${issue.title}`}
                                    value={issue.status}
                                    disabled={!can('project-issues.update')}
                                    onValueChange={(value) =>
                                        void change(issue, value)
                                    }
                                    options={issueStatuses}
                                />
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
