import { Link } from 'react-router';

import { useGetTicketingAuditLogsQuery } from '@/api/endpoints/ticketing';
import type { TicketingAuditLog } from '@/api/ticketing-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { formatDateTime } from '@/lib/date';

export interface AuditFilters {
    client_id?: string;
    action?: string;
    from?: string;
    to?: string;
}

const who = (log: TicketingAuditLog) => {
    if (log.context?.acting_user) {
        return (
            log.context.acting_user.name ||
            `User #${log.context.acting_user.id}`
        );
    }

    return log.actor_id ? `${log.actor_type} #${log.actor_id}` : log.actor_type;
};

/** Context without the acting user (shown in its own column), kept short for the table. */
const details = (log: TicketingAuditLog) => {
    const { acting_user: _acting, ...rest } = log.context ?? {};
    void _acting;
    const text = Object.keys(rest).length > 0 ? JSON.stringify(rest) : '';

    return text.length > 90 ? `${text.slice(0, 90)}…` : text;
};

/** The platform's audit log: who did what, from which IP, and when. */
export function AuditTable({
    filters,
    page,
    onPage,
    showClient = true,
}: {
    filters: AuditFilters;
    page: number;
    onPage: (page: number) => void;
    showClient?: boolean;
}) {
    const { data, isLoading, isError, refetch } = useGetTicketingAuditLogsQuery(
        {
            ...filters,
            page,
        },
    );

    const columns: Column<TicketingAuditLog>[] = [
        {
            key: 'time',
            header: 'When',
            primary: true,
            cell: (log) => (
                <span className="text-xs whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                </span>
            ),
        },
        {
            key: 'action',
            header: 'Action',
            cell: (log) => (
                <Badge
                    tone={log.action === 'auth.failed' ? 'danger' : 'neutral'}
                >
                    {log.action}
                </Badge>
            ),
        },
        {
            key: 'who',
            header: 'By',
            cell: (log) => <span className="text-xs">{who(log)}</span>,
        },
        ...(showClient
            ? [
                  {
                      key: 'client',
                      header: 'Client',
                      hideOnMobile: true,
                      cell: (log: TicketingAuditLog) =>
                          log.client_id ? (
                              <Link
                                  to={`/admin/ticketing/clients/${log.client_id}`}
                                  className="text-xs font-bold text-brand-600 hover:underline"
                              >
                                  #{log.client_id}
                              </Link>
                          ) : (
                              <span className="text-xs text-slate-400">-</span>
                          ),
                  } satisfies Column<TicketingAuditLog>,
              ]
            : []),
        {
            key: 'ip',
            header: 'IP',
            hideOnMobile: true,
            cell: (log) => <span className="text-xs">{log.ip ?? '-'}</span>,
        },
        {
            key: 'details',
            header: 'Details',
            hideOnMobile: true,
            cell: (log) => (
                <code className="text-[11px] break-all text-slate-600">
                    {details(log)}
                </code>
            ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load the audit log"
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
        <div className="space-y-3">
            <DataTable
                columns={columns}
                rows={data?.items}
                rowKey={(log) => log.id}
                loading={isLoading}
                emptyTitle="Nothing logged yet"
            />
            {data ? (
                <Pagination
                    page={data.meta.page}
                    pageCount={data.meta.last_page}
                    total={data.meta.total}
                    onPageChange={onPage}
                />
            ) : null}
        </div>
    );
}
