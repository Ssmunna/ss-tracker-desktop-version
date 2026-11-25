import { Check, ExternalLink, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import type { InboxRequest } from '@/api/approval-types';
import {
    useDecideRequestMutation,
    useGetRequestInboxQuery,
} from '@/api/endpoints/approvals';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import {
    PriorityBadge,
    RequestStatusBadge,
} from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';

import { InboxFilters, StatusTabs } from './inbox';
import { useInboxParams } from './useInboxParams';

type Decision = {
    request: InboxRequest;
    status: 'approved' | 'rejected' | 'pending';
};

function hostname(link: string): string {
    try {
        return new URL(link).hostname;
    } catch {
        return link;
    }
}

export function RequestsInboxPage() {
    const { can } = usePermissions();
    const { query, set, activeFilters, reset } = useInboxParams();
    const { data, isLoading, isFetching, isError, refetch } =
        useGetRequestInboxQuery(query);
    const [viewing, setViewing] = useState<InboxRequest | null>(null);
    const [deciding, setDeciding] = useState<Decision | null>(null);
    const canDecide = can('project-requests.update');

    const actions = (request: InboxRequest) =>
        canDecide ? (
            <div
                className="flex flex-wrap gap-2"
                onClick={(event) => event.stopPropagation()}
            >
                {request.status !== 'approved' ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            setDeciding({ request, status: 'approved' })
                        }
                    >
                        <Check className="size-4 text-emerald-600" /> Approve
                    </Button>
                ) : null}
                {request.status !== 'rejected' ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            setDeciding({ request, status: 'rejected' })
                        }
                    >
                        <X className="size-4 text-red-600" /> Reject
                    </Button>
                ) : null}
                {request.status !== 'pending' ? (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                            setDeciding({ request, status: 'pending' })
                        }
                    >
                        <RotateCcw className="size-4" /> Reopen
                    </Button>
                ) : null}
            </div>
        ) : null;

    const columns: Column<InboxRequest>[] = [
        {
            key: 'request',
            header: 'Request',
            primary: true,
            cell: (request) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {request.title}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {request.project?.name ?? 'Project'}
                        {request.phase ? ` · ${request.phase.name}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (request) => (
                <div className="flex flex-wrap gap-1">
                    <RequestStatusBadge status={request.status} />
                    <PriorityBadge priority={request.priority} />
                </div>
            ),
        },
        {
            key: 'by',
            header: 'Requested by',
            cell: (request) => (
                <div className="text-xs">
                    <p>{request.requested_by?.name ?? 'Unknown'}</p>
                    <p className="text-slate-500">
                        {formatDate(request.created_at)}
                    </p>
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: actions,
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load requests"
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
                    Requests
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Change requests from every project team.
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
                priority
            />

            <div
                className={cn(
                    'space-y-3 transition-opacity',
                    isFetching && !isLoading && 'opacity-70',
                )}
            >
                <DataTable
                    columns={columns}
                    rows={data?.requests}
                    rowKey={(request) => request.id}
                    loading={isLoading}
                    emptyTitle={
                        query.status || activeFilters > 0
                            ? 'No request matches these filters'
                            : 'No requests yet'
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
                        title={viewing.title}
                        description={`${viewing.project?.name ?? 'Project'}${viewing.phase ? ` · ${viewing.phase.name}` : ''}`}
                        size="lg"
                        footer={
                            <>
                                <ModalClose asChild>
                                    <Button variant="secondary">Close</Button>
                                </ModalClose>
                                {viewing.project ? (
                                    <Button asChild variant="outline">
                                        <Link
                                            to={`/admin/projects/${viewing.project.id}?tab=requests`}
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
                            <div className="flex flex-wrap gap-2">
                                <RequestStatusBadge status={viewing.status} />
                                <PriorityBadge priority={viewing.priority} />
                            </div>
                            {viewing.description ? (
                                <p className="text-sm whitespace-pre-line text-slate-700">
                                    {viewing.description}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-500">
                                    No description.
                                </p>
                            )}
                            {viewing.links?.length ? (
                                <ul className="flex flex-wrap gap-3">
                                    {viewing.links.map((link) => (
                                        <li key={link}>
                                            <a
                                                href={link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                                            >
                                                <ExternalLink className="size-3" />
                                                {hostname(link)}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            <p className="text-xs text-slate-500">
                                By {viewing.requested_by?.name ?? 'Unknown'} ·{' '}
                                {formatDateTime(viewing.created_at)}
                                {viewing.reviewed_by
                                    ? ` · reviewed by ${viewing.reviewed_by.name} ${formatDateTime(viewing.reviewed_at)}`
                                    : ''}
                                {viewing.approved_date
                                    ? ` · approved for ${formatDate(viewing.approved_date)}`
                                    : ''}
                            </p>
                            {viewing.reason ? (
                                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                                    {viewing.reason}
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
                        key={`${deciding.request.id}-${deciding.status}`}
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
    approved: 'Approve request',
    rejected: 'Reject request',
    pending: 'Reopen request',
};

function DecisionForm({
    decision,
    onDone,
}: {
    decision: Decision;
    onDone: () => void;
}) {
    const [decide, { isLoading }] = useDecideRequestMutation();
    const [reason, setReason] = useState('');
    const [date, setDate] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { request, status } = decision;

    return (
        <ModalContent
            title={TITLES[status]}
            description={request.title}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="decide-request"
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
                id="decide-request"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await decide({
                            id: request.id,
                            status,
                            reason,
                            approved_date:
                                status === 'approved' && date
                                    ? date
                                    : undefined,
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
                    <Field
                        label="Approved date"
                        hint="Defaults to today"
                        error={errors.approved_date}
                    >
                        <Input
                            type="date"
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                        />
                    </Field>
                ) : null}
                <Field
                    label="Reason"
                    required
                    hint="Shown to the requester"
                    error={errors.reason}
                >
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
