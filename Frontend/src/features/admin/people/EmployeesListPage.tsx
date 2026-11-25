import {
    ExternalLink,
    KeyRound,
    Link2,
    Mail,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import {
    useDeleteEmployeeMutation,
    useEmployeeEmailResetLinkMutation,
    useEmployeeResetLinkMutation,
    useGetEmployeesQuery,
} from '@/api/endpoints/people';
import type { EmployeeRow } from '@/api/people-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { ACTIVE_OPTIONS } from '@/features/admin/org/options';
import {
    ActiveBadge,
    InviteLinkDialog,
    PageHeader,
} from '@/features/admin/org/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { cn } from '@/lib/utils';

export function EmployeesListPage() {
    const { can } = usePermissions();
    const run = useRun();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const search = params.get('search') ?? '';
    const status = params.get('status') ?? '';
    const departmentId = params.get('department_id') ?? '';
    const page = Number(params.get('page') ?? 1);
    const [draft, setDraft] = useState(search);
    const { data, isLoading, isFetching, isError, refetch } =
        useGetEmployeesQuery({
            search: search || undefined,
            status: status || undefined,
            department_id: departmentId || undefined,
            page,
        });
    const [deleting, setDeleting] = useState<EmployeeRow | null>(null);
    const [link, setLink] = useState<string | null>(null);
    const [remove] = useDeleteEmployeeMutation();
    const [resetLink] = useEmployeeResetLinkMutation();
    const [emailLink] = useEmployeeEmailResetLinkMutation();

    const set = (next: Record<string, string | null>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value) {
                copy.set(key, value);
            } else {
                copy.delete(key);
            }
        }

        if (!('page' in next)) {
            copy.delete('page');
        }

        setParams(copy, { replace: true });
    };

    useEffect(() => {
        if (draft === search) {
            return;
        }

        const timer = window.setTimeout(
            () => set({ search: draft.trim() || null }),
            400,
        );

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    const columns: Column<EmployeeRow>[] = [
        {
            key: 'name',
            header: 'Employee',
            primary: true,
            cell: (row) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {row.name}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {row.developer_code} · {row.email}
                    </p>
                </div>
            ),
        },
        {
            key: 'department',
            header: 'Department',
            cell: (row) => (
                <span className="text-xs">{row.department ?? '-'}</span>
            ),
        },
        {
            key: 'roles',
            header: 'Roles',
            hideOnMobile: true,
            cell: (row) => (
                <div className="flex flex-wrap gap-1">
                    {row.role_names.map((name) => (
                        <Badge key={name}>{name}</Badge>
                    ))}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (row) => (
                <ActiveBadge status={row.is_active ? 'active' : 'inactive'} />
            ),
        },
        {
            key: 'kpi',
            header: 'KPI (month)',
            cell: (row) => (
                <span className="text-xs">
                    {row.kpi_month_total}% · {row.completed_tasks_month_count}{' '}
                    done
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (row) => (
                <div onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${row.name}`}
                            >
                                <MoreHorizontal className="size-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onSelect={() =>
                                    navigate(`/admin/employees/${row.id}`)
                                }
                            >
                                <ExternalLink className="size-4" /> Open
                            </DropdownMenuItem>
                            {can('employees.update') ? (
                                <DropdownMenuItem
                                    onSelect={() =>
                                        navigate(
                                            `/admin/employees/${row.id}/edit`,
                                        )
                                    }
                                >
                                    <Pencil className="size-4" /> Edit
                                </DropdownMenuItem>
                            ) : null}
                            {can('employees.special-permissions.update') ? (
                                <DropdownMenuItem
                                    onSelect={() =>
                                        navigate(
                                            `/admin/employees/${row.id}/permissions`,
                                        )
                                    }
                                >
                                    <KeyRound className="size-4" /> Special
                                    permissions
                                </DropdownMenuItem>
                            ) : null}
                            {can('employees.reset-password-link') ? (
                                <>
                                    <DropdownMenuItem
                                        onSelect={async () => {
                                            try {
                                                setLink(
                                                    (
                                                        await resetLink(
                                                            row.id,
                                                        ).unwrap()
                                                    ).invite_link,
                                                );
                                            } catch (error) {
                                                toast.error(
                                                    errorMessage(error),
                                                );
                                            }
                                        }}
                                    >
                                        <Link2 className="size-4" /> Get
                                        password link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            void run(emailLink(row.id))
                                        }
                                    >
                                        <Mail className="size-4" /> Email
                                        password link
                                    </DropdownMenuItem>
                                </>
                            ) : null}
                            {can('employees.delete') ? (
                                <DropdownMenuItem
                                    destructive
                                    onSelect={() => setDeleting(row)}
                                >
                                    <Trash2 className="size-4" /> Delete
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load employees"
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

    const active =
        Number(Boolean(search)) +
        Number(Boolean(status)) +
        Number(Boolean(departmentId));

    return (
        <div className="space-y-5">
            <PageHeader
                title="Employees"
                description={
                    data ? `${data.meta.total} employee(s)` : undefined
                }
                action={
                    can('employees.create') ? (
                        <Button asChild>
                            <Link to="/admin/employees/new">
                                <Plus className="size-4" /> New employee
                            </Link>
                        </Button>
                    ) : null
                }
            />
            <FilterBar
                activeCount={active}
                onReset={() => {
                    setDraft('');
                    setParams(new URLSearchParams(), { replace: true });
                }}
            >
                <Field label="Department" className="lg:w-48">
                    <Select
                        density="compact"
                        value={departmentId || 'all'}
                        onValueChange={(value) =>
                            set({
                                department_id: value === 'all' ? null : value,
                            })
                        }
                        options={[
                            { value: 'all', label: 'All departments' },
                            ...(data?.departments ?? []).map((item) => ({
                                value: String(item.id),
                                label: item.name,
                            })),
                        ]}
                    />
                </Field>
                <Field label="Status" className="lg:w-40">
                    <Select
                        density="compact"
                        value={status || 'all'}
                        onValueChange={(value) =>
                            set({ status: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All' },
                            ...ACTIVE_OPTIONS,
                        ]}
                    />
                </Field>
                <Field label="Search" className="lg:ml-auto lg:w-72">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            density="compact"
                            className="pl-9"
                            placeholder="Name, code, email or department"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                        />
                    </div>
                </Field>
            </FilterBar>
            <div
                className={cn(
                    'space-y-3 transition-opacity',
                    isFetching && !isLoading && 'opacity-70',
                )}
            >
                <DataTable
                    columns={columns}
                    rows={data?.developers}
                    rowKey={(row) => row.id}
                    loading={isLoading}
                    emptyTitle={
                        active > 0
                            ? 'No employee matches these filters'
                            : 'No employees yet'
                    }
                    onRowClick={(row) => navigate(`/admin/employees/${row.id}`)}
                />
                {data ? (
                    <Pagination
                        page={data.meta.current_page}
                        pageCount={data.meta.last_page}
                        total={data.meta.total}
                        onPageChange={(next) => set({ page: String(next) })}
                    />
                ) : null}
            </div>
            <InviteLinkDialog link={link} onClose={() => setLink(null)} />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete employee?"
                description={
                    deleting
                        ? `"${deleting.name}" and their login will be removed. Employees with reports cannot be deleted.`
                        : ''
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (deleting && (await run(remove(deleting.id)))) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}
