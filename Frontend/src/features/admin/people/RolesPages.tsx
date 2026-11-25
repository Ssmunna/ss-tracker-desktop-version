import { ArrowLeft, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useDeleteRoleMutation,
    useGetRoleQuery,
    useGetRolesQuery,
    useSaveRoleMutation,
} from '@/api/endpoints/people';
import type { PermissionGroup, RoleRow } from '@/api/people-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/features/admin/org/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';

import { PermissionChecklist } from './PermissionChecklist';

export function RolesListPage() {
    const { can } = usePermissions();
    const run = useRun();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { data, isLoading, isError, refetch } = useGetRolesQuery({
        page: Number(params.get('page') ?? 1),
    });
    const [deleting, setDeleting] = useState<RoleRow | null>(null);
    const [remove] = useDeleteRoleMutation();

    const columns: Column<RoleRow>[] = [
        {
            key: 'name',
            header: 'Role',
            primary: true,
            cell: (role) => (
                <span className="font-bold text-slate-900">{role.name}</span>
            ),
        },
        {
            key: 'permissions',
            header: 'Permissions',
            cell: (role) => <Badge tone="info">{role.permissions_count}</Badge>,
        },
        {
            key: 'users',
            header: 'Users',
            cell: (role) => <span className="text-xs">{role.users_count}</span>,
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (role) =>
                can('roles.update') || can('roles.delete') ? (
                    <div onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Actions for ${role.name}`}
                                >
                                    <MoreHorizontal className="size-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {can('roles.update') ? (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            navigate(
                                                `/admin/roles/${role.id}/edit`,
                                            )
                                        }
                                    >
                                        <Pencil className="size-4" /> Edit
                                    </DropdownMenuItem>
                                ) : null}
                                {can('roles.delete') ? (
                                    <DropdownMenuItem
                                        destructive
                                        onSelect={() => setDeleting(role)}
                                    >
                                        <Trash2 className="size-4" /> Delete
                                    </DropdownMenuItem>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : null,
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load roles"
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
            <PageHeader
                title="Roles & permissions"
                description="Custom roles. A change applies on the person's next request."
                action={
                    can('roles.create') ? (
                        <Button asChild>
                            <Link to="/admin/roles/new">
                                <Plus className="size-4" /> New role
                            </Link>
                        </Button>
                    ) : null
                }
            />
            <DataTable
                columns={columns}
                rows={data?.roles}
                rowKey={(role) => role.id}
                loading={isLoading}
                emptyTitle="No custom roles yet"
                onRowClick={
                    can('roles.update')
                        ? (role) => navigate(`/admin/roles/${role.id}/edit`)
                        : undefined
                }
            />
            {data ? (
                <Pagination
                    page={data.meta.current_page}
                    pageCount={data.meta.last_page}
                    total={data.meta.total}
                    onPageChange={(next) =>
                        setParams({ page: String(next) }, { replace: true })
                    }
                />
            ) : null}
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete role?"
                description={
                    deleting
                        ? `"${deleting.name}" will be removed. Roles in use cannot be deleted.`
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

export function RoleFormPage() {
    const roleId = useParams().roleId;
    const id = roleId ? Number(roleId) : undefined;
    const create = useGetRolesQuery({ page: 1 }, { skip: id !== undefined });
    const edit = useGetRoleQuery(id ?? 0, { skip: id === undefined });
    const query = id === undefined ? create : edit;
    const groups: PermissionGroup[] | undefined =
        id === undefined
            ? create.data?.permission_groups
            : edit.data?.permission_groups;

    if (query.isError) {
        return <ErrorState title="Could not load this role" />;
    }

    if (query.isLoading || !groups) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <RoleForm
            key={id ?? 'new'}
            id={id}
            groups={groups}
            initialName={edit.data?.role.name ?? ''}
            initialPermissions={
                edit.data?.role.permissions.map(
                    (permission) => permission.id,
                ) ?? []
            }
        />
    );
}

function RoleForm({
    id,
    groups,
    initialName,
    initialPermissions,
}: {
    id?: number;
    groups: PermissionGroup[];
    initialName: string;
    initialPermissions: number[];
}) {
    const navigate = useNavigate();
    const [save, { isLoading }] = useSaveRoleMutation();
    const [name, setName] = useState(initialName);
    const [selected, setSelected] = useState<number[]>(initialPermissions);
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <form
            className="space-y-5 pb-24"
            onSubmit={async (event) => {
                event.preventDefault();

                try {
                    const result = await save({
                        id,
                        name,
                        permissions: selected,
                    }).unwrap();
                    toast.success(result.message);
                    navigate('/admin/roles');
                } catch (error) {
                    const fields = fieldErrors(error);
                    setErrors(fields);

                    if (Object.keys(fields).length === 0) {
                        toast.error(errorMessage(error));
                    }
                }
            }}
        >
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/roles">
                        <ArrowLeft className="size-4" /> Roles
                    </Link>
                </Button>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    {id ? 'Edit role' : 'New role'}
                </h1>
            </div>
            <Card className="max-w-lg">
                <Field label="Role name" required error={errors.name}>
                    <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
            </Card>
            <div className="space-y-2">
                <p className="text-sm font-bold text-slate-900">
                    Permissions{' '}
                    <span className="font-normal text-slate-500">
                        ({selected.length} selected)
                    </span>
                </p>
                {errors.permissions ? (
                    <p className="text-xs text-red-600">{errors.permissions}</p>
                ) : null}
                <PermissionChecklist
                    groups={groups}
                    selected={selected}
                    onChange={setSelected}
                />
            </div>
            <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-surface p-3 lg:left-64">
                <div className="flex justify-end gap-2">
                    <Button asChild variant="secondary">
                        <Link to="/admin/roles">Cancel</Link>
                    </Button>
                    <Button type="submit" loading={isLoading}>
                        Save role
                    </Button>
                </div>
            </div>
        </form>
    );
}
