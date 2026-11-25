import { Check, ExternalLink, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import type { InboxExtension } from '@/api/approval-types';
import {
    useDecideExtensionMutation,
    useGetExtensionInboxQuery,
} from '@/api/endpoints/approvals';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { RequestStatusBadge } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { InboxFilters, StatusTabs } from './inbox';
import { useInboxParams } from './useInboxParams';

type Decision = {
    extension: InboxExtension;
    status: 'approved' | 'rejected' | 'pending';
};

const percent = (value: number | string | null | undefined) =>
    value === null || value === undefined ? '-' : `${Number(value)}%`;

export function ExtensionsInboxPage() {
    const { t } = usePhaseLabel();
    const { can } = usePermissions();
    const { query, set, activeFilters, reset } = useInboxParams();
    const { data, isLoading, isFetching, isError, refetch } =
        useGetExtensionInboxQuery(query);
    const [viewing, setViewing] = useState<InboxExtension | null>(null);
    const [deciding, setDeciding] = useState<Decision | null>(null);
    const canDecide = can('project-deadline-extensions.update');

    const actions = (extension: InboxExtension) =>
        canDecide ? (
            <div
                className="flex flex-wrap gap-2"
                onClick={(event) => event.stopPropagation()}
            >
                {extension.status !== 'approved' ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            setDeciding({ extension, status: 'approved' })
                        }
                    >
                        <Check className="size-4 text-emerald-600" /> Approve
                    </Button>
                ) : null}
                {extension.status !== 'rejected' ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            setDeciding({ extension, status: 'rejected' })
                        }
                    >
                        <X className="size-4 text-red-600" /> Reject
                    </Button>
                ) : null}
                {extension.status !== 'pending' ? (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                            setDeciding({ extension, status: 'pending' })
                        }
                    >
                        <RotateCcw className="size-4" /> Reopen
                    </Button>
                ) : null}
            </div>
        ) : null;

    const columns: Column<InboxExtension>[] = [
        {
            key: 'project',
            header: 'Project',
            primary: true,
            cell: (extension) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {extension.project?.name ?? 'Project'}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {extension.phase?.name ?? 'Whole project'} ·{' '}
                        {extension.requested_by?.name ?? 'Unknown'}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (extension) => (
                <div className="flex flex-wrap gap-1">
                    <RequestStatusBadge status={extension.status} />
                    {extension.extension_type ? (
                        <Badge
                            tone={
                                extension.extension_type === 'Failed'
                                    ? 'danger'
                                    : 'info'
                            }
                        >
                            {extension.extension_type}
                        </Badge>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (extension) => (
                <span className="text-xs">
                    {formatDate(extension.current_deadline_snapshot)} →{' '}
                    {formatDate(
                        extension.new_deadline ?? extension.requested_deadline,
                    )}
                </span>
            ),
        },
        {
            key: 'weight',
            header: 'Weight',
            hideOnMobile: true,
            cell: (extension) => (
                <span className="text-xs">
                    {extension.status === 'approved'
                        ? `${percent(extension.previous_weight)} → ${percent(extension.new_weight)}`
                        : `${percent(extension.project?.effective_weight)}`}
                </span>
            ),
        },
        { key: 'actions', header: '', cell: actions },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load extension requests"
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

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Deadline extensions
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    {t(
                        'Approving moves the phase deadline and fixes its KPI weight.',
                    )}
                </p>
            </div>

            <StatusTabs
                value={query.status ?? ''}
                counts={data?.status_counts}
                onChange={(status) => set({ status })}
            />

            <InboxFilters
                query={query}
                set={set}
                activeFilters={activeFilters}
                reset={reset}
                departments={data?.departments}
                projects={data?.projects}
                phases={data?.phases}
                categories={data?.categories}
            />

            <div
                className={cn(
                    'space-y-3 transition-opacity',
                    isFetching && !isLoading && 'opacity-70',
                )}
            >
                <DataTable
                    columns={columns}
                    rows={data?.extensions}
                    rowKey={(extension) => extension.id}
                    loading={isLoading}
                    emptyTitle={
                        query.status || activeFilters > 0
                            ? 'No extension matches these filters'
                            : 'No extension requests yet'
                    }
                    onRowClick={setViewing}
                />
                {data ? (
                    <Pagination
                        page={data.meta.current_page}
                        pageCount={data.meta.last_page}
                        total={data.meta.total}
                        onPageChange={(page) => set({ page: String(page) })}
                    />
                ) : null}
            </div>

            <Modal
                open={viewing !== null}
                onOpenChange={(open) => !open && setViewing(null)}
            >
                {viewing ? (
                    <ModalContent
                        title={viewing.project?.name ?? 'Deadline extension'}
                        description={viewing.phase?.name ?? 'Whole project'}
                        size="lg"
                        footer={
                            <>
                                <ModalClose asChild>
                                    <Button variant="secondary">Close</Button>
                                </ModalClose>
                                {viewing.project ? (
                                    <Button asChild variant="outline">
                                        <Link
                                            to={`/admin/projects/${viewing.project.id}?tab=extensions`}
                                        >
                                            <ExternalLink className="size-4" />{' '}
                                            Open project
                                        </Link>
                                    </Button>
                                ) : null}
                            </>
                        }
                    >
                        <div className="space-y-3 pt-1">
                            <RequestStatusBadge status={viewing.status} />
                            <p className="text-sm whitespace-pre-line text-slate-700">
                                {viewing.reason}
                            </p>
                            <dl className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <dt className="text-slate-500">
                                        Current deadline
                                    </dt>
                                    <dd className="font-bold text-slate-900">
                                        {formatDate(
                                            viewing.current_deadline_snapshot,
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">
                                        Requested
                                    </dt>
                                    <dd className="font-bold text-slate-900">
                                        {formatDate(viewing.requested_deadline)}
                                    </dd>
                                </div>
                                {viewing.status === 'approved' ? (
                                    <>
                                        <div>
                                            <dt className="text-slate-500">
                                                Approved deadline
                                            </dt>
                                            <dd className="font-bold text-slate-900">
                                                {formatDate(
                                                    viewing.new_deadline,
                                                )}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-500">
                                                Weight
                                            </dt>
                                            <dd className="font-bold text-slate-900">
                                                {percent(
                                                    viewing.previous_weight,
                                                )}{' '}
                                                → {percent(viewing.new_weight)}
                                            </dd>
                                        </div>
                                    </>
                                ) : null}
                            </dl>
                            <p className="text-xs text-slate-500">
                                By {viewing.requested_by?.name ?? 'Unknown'} ·{' '}
                                {formatDateTime(viewing.created_at)}
                                {viewing.reviewed_by
                                    ? ` · reviewed by ${viewing.reviewed_by.name} ${formatDateTime(viewing.reviewed_at)}`
                                    : ''}
                            </p>
                            {viewing.review_note ? (
                                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                                    {viewing.review_note}
                                </p>
                            ) : null}
                            {actions(viewing)}
                        </div>
                    </ModalContent>
                ) : null}
            </Modal>

            <Modal
                open={deciding !== null}
                onOpenChange={(open) => !open && setDeciding(null)}
            >
                {deciding ? (
                    <DecisionForm
                        key={`${deciding.extension.id}-${deciding.status}`}
                        decision={deciding}
                        onDone={() => {
                            setDeciding(null);
                            setViewing(null);
                        }}
                    />
                ) : null}
            </Modal>
        </div>
    );
}

const TITLES = {
    approved: 'Approve extension',
    rejected: 'Reject extension',
    pending: 'Reopen extension',
};

function DecisionForm({
    decision,
    onDone,
}: {
    decision: Decision;
    onDone: () => void;
}) {
    const { extension, status } = decision;
    const [decide, { isLoading }] = useDecideExtensionMutation();
    const [deadline, setDeadline] = useState(
        extension.requested_deadline?.slice(0, 10) ?? '',
    );
    const [type, setType] = useState('Regular');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const preview = extension.weight_preview;

    return (
        <ModalContent
            title={TITLES[status]}
            description={extension.project?.name}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="decide-extension"
                        variant={
                            status === 'rejected' ? 'destructive' : 'primary'
                        }
                        loading={isLoading}
                    >
                        {status === 'approved'
                            ? 'Approve'
                            : status === 'rejected'
                              ? 'Reject'
                              : 'Reopen'}
                    </Button>
                </>
            }
        >
            <form
                id="decide-extension"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await decide({
                            id: extension.id,
                            status,
                            ...(status === 'approved'
                                ? {
                                      new_deadline: deadline,
                                      extension_type: type,
                                  }
                                : {}),
                            review_note: note || null,
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
                            hint={`Weight if Regular: ${percent(preview.regular)} · if Failed: ${percent(preview.failed)}`}
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
                <Field label="Note" hint="Optional" error={errors.review_note}>
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
