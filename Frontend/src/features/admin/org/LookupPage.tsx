import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useDeleteCategoryMutation,
    useDeleteDepartmentMutation,
    useGetCategoriesQuery,
    useGetDepartmentsQuery,
    useSaveCategoryMutation,
    useSaveDepartmentMutation,
} from '@/api/endpoints/org';
import type { CategoryRow, DepartmentRow } from '@/api/org-types';
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
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';

import { ActiveBadge, PageHeader } from './shared';
import { ACTIVE_OPTIONS } from './options';

type Row = DepartmentRow | CategoryRow;

interface Config {
    kind: 'department' | 'category';
    title: string;
    singular: string;
    permission: string;
}

const CONFIG: Record<Config['kind'], Config> = {
    department: {
        kind: 'department',
        title: 'Departments',
        singular: 'department',
        permission: 'departments',
    },
    category: {
        kind: 'category',
        title: 'Project categories',
        singular: 'category',
        permission: 'project-categories',
    },
};

/** Departments and project categories share one list-and-dialog screen. */
function LookupPage({ config }: { config: Config }) {
    const { can } = usePermissions();
    const run = useRun();
    const isDepartment = config.kind === 'department';
    const [params, setParams] = useSearchParams();
    const page = Number(params.get('page') ?? 1);
    const departments = useGetDepartmentsQuery(
        { page },
        { skip: !isDepartment },
    );
    const categories = useGetCategoriesQuery({ page }, { skip: isDepartment });
    const query = isDepartment ? departments : categories;
    const rows: Row[] | undefined = isDepartment
        ? departments.data?.departments
        : categories.data?.categories;
    const meta = query.data?.meta;
    const [editing, setEditing] = useState<Row | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Row | null>(null);
    const [removeDepartment] = useDeleteDepartmentMutation();
    const [removeCategory] = useDeleteCategoryMutation();
    const canUpdate = can(`${config.permission}.update`);
    const canDelete = can(`${config.permission}.delete`);

    const columns: Column<Row>[] = [
        {
            key: 'name',
            header: 'Name',
            primary: true,
            cell: (row) => (
                <span className="font-bold text-slate-900">{row.name}</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (row) => <ActiveBadge status={row.status} />,
        },
        isDepartment
            ? {
                  key: 'usage',
                  header: 'Usage',
                  cell: (row) => (
                      <span className="text-xs">
                          {(row as DepartmentRow).members_count} member(s) ·{' '}
                          {(row as DepartmentRow).projects_count} project(s)
                      </span>
                  ),
              }
            : {
                  key: 'usage',
                  header: 'Weight',
                  cell: (row) => (
                      <span className="text-xs">
                          {(row as CategoryRow).weight}% ·{' '}
                          {(row as CategoryRow).projects_count} project(s)
                      </span>
                  ),
              },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (row) =>
                canUpdate || canDelete ? (
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
                                {canUpdate ? (
                                    <DropdownMenuItem
                                        onSelect={() => setEditing(row)}
                                    >
                                        <Pencil className="size-4" /> Edit
                                    </DropdownMenuItem>
                                ) : null}
                                {canDelete ? (
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
                ) : null,
        },
    ];

    if (query.isError) {
        return (
            <ErrorState
                title={`Could not load ${config.title.toLowerCase()}`}
                action={
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => query.refetch()}
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
                title={config.title}
                description={meta ? `${meta.total} total` : undefined}
                action={
                    can(`${config.permission}.create`) ? (
                        <Button onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> New {config.singular}
                        </Button>
                    ) : null
                }
            />
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                loading={query.isLoading}
                emptyTitle={`No ${config.title.toLowerCase()} yet`}
            />
            {meta ? (
                <Pagination
                    page={meta.current_page}
                    pageCount={meta.last_page}
                    total={meta.total}
                    onPageChange={(next) =>
                        setParams({ page: String(next) }, { replace: true })
                    }
                />
            ) : null}

            <Modal
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                {editing ? (
                    <LookupForm
                        key={editing === 'new' ? 'new' : editing.id}
                        config={config}
                        row={editing === 'new' ? null : editing}
                        onDone={() => setEditing(null)}
                    />
                ) : null}
            </Modal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title={`Delete ${config.singular}?`}
                description={
                    deleting ? `"${deleting.name}" will be removed.` : ''
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (!deleting) {
                        return;
                    }

                    const ok = await run(
                        isDepartment
                            ? removeDepartment(deleting.id)
                            : removeCategory(deleting.id),
                    );

                    if (ok) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

function LookupForm({
    config,
    row,
    onDone,
}: {
    config: Config;
    row: Row | null;
    onDone: () => void;
}) {
    const isDepartment = config.kind === 'department';
    const [saveDepartment, department] = useSaveDepartmentMutation();
    const [saveCategory, category] = useSaveCategoryMutation();
    const loading = department.isLoading || category.isLoading;
    const [name, setName] = useState(row?.name ?? '');
    const [status, setStatus] = useState<string>(row?.status ?? 'active');
    const [weight, setWeight] = useState(
        String((row as CategoryRow | null)?.weight ?? ''),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const formId = `lookup-${config.kind}`;

    return (
        <ModalContent
            title={`${row ? 'Edit' : 'New'} ${config.singular}`}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button type="submit" form={formId} loading={loading}>
                        Save
                    </Button>
                </>
            }
        >
            <form
                id={formId}
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = isDepartment
                            ? await saveDepartment({
                                  id: row?.id,
                                  name,
                                  status,
                              }).unwrap()
                            : await saveCategory({
                                  id: row?.id,
                                  name,
                                  status,
                                  weight: Number(weight),
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
                <Field label="Name" required error={errors.name}>
                    <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                {!isDepartment ? (
                    <Field
                        label="Weight (%)"
                        required
                        hint="Share of KPI this category carries (0 to 100)."
                        error={errors.weight}
                    >
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={weight}
                            onChange={(event) => setWeight(event.target.value)}
                        />
                    </Field>
                ) : null}
                <Field label="Status" required error={errors.status}>
                    <Select
                        value={status}
                        onValueChange={setStatus}
                        options={ACTIVE_OPTIONS}
                    />
                </Field>
            </form>
        </ModalContent>
    );
}

export const DepartmentsPage = () => <LookupPage config={CONFIG.department} />;
export const CategoriesPage = () => <LookupPage config={CONFIG.category} />;
