import {
    ArrowDown,
    ArrowUp,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useDeleteProjectGroupMutation,
    useGetProjectGroupsQuery,
    useReorderProjectGroupsMutation,
    useSaveProjectGroupMutation,
} from '@/api/endpoints/org';
import type { ProjectGroupRow } from '@/api/org-types';
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
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';

import { ACTIVE_OPTIONS } from './options';
import { ActiveBadge, PageHeader } from './shared';

const DEFAULT_COLOR = '#f97316';

/** Project groups: the brands / ecosystems the sidebar's "Ez Universe" lists projects under. */
export function ProjectGroupsPage() {
    const { can } = usePermissions();
    const run = useRun();
    const { data, isLoading, isError, refetch } = useGetProjectGroupsQuery();
    const [editing, setEditing] = useState<ProjectGroupRow | 'new' | null>(
        null,
    );
    const [deleting, setDeleting] = useState<ProjectGroupRow | null>(null);
    const [remove] = useDeleteProjectGroupMutation();
    const [reorder, { isLoading: reordering }] =
        useReorderProjectGroupsMutation();
    const groups = data?.groups;
    const canUpdate = can('project-groups.update');
    const canDelete = can('project-groups.delete');

    const move = (index: number, by: -1 | 1) => {
        if (!groups) {
            return;
        }

        const ids = groups.map((group) => group.id);
        [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
        void run(reorder(ids));
    };

    const columns: Column<ProjectGroupRow>[] = [
        {
            key: 'name',
            header: 'Group',
            primary: true,
            cell: (group) => (
                <div className="flex items-center gap-2.5">
                    <span
                        aria-hidden
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: group.color }}
                    />
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900">{group.name}</p>
                        {group.description ? (
                            <p className="truncate text-xs text-slate-500">
                                {group.description}
                            </p>
                        ) : null}
                    </div>
                </div>
            ),
        },
        {
            key: 'projects',
            header: 'Projects',
            cell: (group) => (
                <Link
                    to={`/admin/projects?group_id=${group.id}`}
                    className="text-sm font-semibold text-brand-600 hover:underline"
                >
                    {group.projects_count} project(s)
                </Link>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (group) => <ActiveBadge status={group.status} />,
        },
        {
            key: 'actions',
            header: '',
            className: 'w-32',
            cell: (group) => {
                const index = groups?.findIndex((g) => g.id === group.id) ?? 0;

                return (
                    <div
                        className="flex items-center justify-end gap-1"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {canUpdate ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Move ${group.name} up`}
                                    disabled={index === 0 || reordering}
                                    onClick={() => move(index, -1)}
                                >
                                    <ArrowUp className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Move ${group.name} down`}
                                    disabled={
                                        index === (groups?.length ?? 1) - 1 ||
                                        reordering
                                    }
                                    onClick={() => move(index, 1)}
                                >
                                    <ArrowDown className="size-4" />
                                </Button>
                            </>
                        ) : null}
                        {canUpdate || canDelete ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Actions for ${group.name}`}
                                    >
                                        <MoreHorizontal className="size-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {canUpdate ? (
                                        <DropdownMenuItem
                                            onSelect={() => setEditing(group)}
                                        >
                                            <Pencil className="size-4" /> Edit
                                        </DropdownMenuItem>
                                    ) : null}
                                    {canDelete ? (
                                        <DropdownMenuItem
                                            destructive
                                            onSelect={() => setDeleting(group)}
                                        >
                                            <Trash2 className="size-4" /> Delete
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load project groups"
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
                title="Project groups"
                description="Brands and ecosystems. Active groups appear in the sidebar under Ez Universe, in this order."
                action={
                    can('project-groups.create') ? (
                        <Button onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> New group
                        </Button>
                    ) : null
                }
            />
            <DataTable
                columns={columns}
                rows={groups}
                rowKey={(group) => group.id}
                loading={isLoading}
                emptyTitle="No project groups yet"
            />

            <Modal
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                {editing ? (
                    <GroupForm
                        key={editing === 'new' ? 'new' : editing.id}
                        group={editing === 'new' ? null : editing}
                        onDone={() => setEditing(null)}
                    />
                ) : null}
            </Modal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete project group?"
                description={
                    deleting
                        ? `"${deleting.name}" will be removed. Its ${deleting.projects_count} project(s) are kept and become ungrouped.`
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

function GroupForm({
    group,
    onDone,
}: {
    group: ProjectGroupRow | null;
    onDone: () => void;
}) {
    const [save, { isLoading }] = useSaveProjectGroupMutation();
    const [name, setName] = useState(group?.name ?? '');
    const [color, setColor] = useState(group?.color ?? DEFAULT_COLOR);
    const [description, setDescription] = useState(group?.description ?? '');
    const [status, setStatus] = useState(group?.status ?? 'active');
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <ModalContent
            title={`${group ? 'Edit' : 'New'} project group`}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="project-group-form"
                        loading={isLoading}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <form
                id="project-group-form"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await save({
                            id: group?.id,
                            name,
                            color,
                            description,
                            status,
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
                        placeholder="Ez Hishab"
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <Field label="Colour" error={errors.color}>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            aria-label="Group colour"
                            value={color}
                            onChange={(event) => setColor(event.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                        />
                        <span className="text-sm text-slate-500">{color}</span>
                    </div>
                </Field>
                <Field label="Description" error={errors.description}>
                    <Input
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </Field>
                <Field
                    label="Status"
                    required
                    hint="Inactive groups are hidden from the sidebar."
                    error={errors.status}
                >
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
