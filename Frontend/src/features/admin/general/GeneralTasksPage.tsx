import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useDeleteGeneralTaskMutation,
    useGetGeneralIndexQuery,
    useSaveGeneralTaskMutation,
    useSetGeneralWeightMutation,
} from '@/api/endpoints/generalTasks';
import type { AdminGeneralTask, Person } from '@/api/general-types';
import type { Priority } from '@/api/employee-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/features/admin/org/shared';
import { PriorityBadge } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';

import { currentMonth } from './month';
import { GeneralTabs, MonthField } from './shared';

const PRIORITIES = ['urgent', 'high', 'normal', 'low'].map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
}));

export function GeneralTasksPage() {
    const { can } = usePermissions();
    const run = useRun();
    const [params, setParams] = useSearchParams();
    const month = params.get('month') ?? currentMonth();
    const developerId = params.get('developer_id') ?? '';
    const status = params.get('status') ?? '';
    const { data, isLoading, isError, refetch } = useGetGeneralIndexQuery({
        month,
        developer_id: developerId || undefined,
        status: status || undefined,
    });
    const [editing, setEditing] = useState<AdminGeneralTask | 'new' | null>(
        null,
    );
    const [deleting, setDeleting] = useState<AdminGeneralTask | null>(null);
    const [remove] = useDeleteGeneralTaskMutation();
    const [weightOpen, setWeightOpen] = useState(false);
    const canAssign = can('general-tasks.assign');

    const set = (next: Record<string, string | null>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value) {
                copy.set(key, value);
            } else {
                copy.delete(key);
            }
        }

        setParams(copy, { replace: true });
    };

    const columns: Column<AdminGeneralTask>[] = [
        {
            key: 'title',
            header: 'Task',
            primary: true,
            cell: (task) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {task.title}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {task.assignee
                            ? `${task.assignee.name} (${task.assignee.developer_code})`
                            : 'Unassigned'}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (task) => (
                <div className="flex flex-wrap gap-1">
                    <Badge
                        tone={
                            task.status === 'completed'
                                ? 'success'
                                : task.is_overdue
                                  ? 'danger'
                                  : 'warning'
                        }
                    >
                        {task.status === 'completed'
                            ? 'Completed'
                            : task.is_overdue
                              ? 'Overdue'
                              : 'Pending'}
                    </Badge>
                    <PriorityBadge
                        priority={task.priority as Priority | null}
                    />
                    {task.is_locked ? <Badge>Month closed</Badge> : null}
                </div>
            ),
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (task) => (
                <span className="text-xs">{formatDate(task.deadline)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (task) =>
                canAssign && !task.is_locked ? (
                    <div onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Actions for ${task.title}`}
                                >
                                    <MoreHorizontal className="size-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem
                                    onSelect={() => setEditing(task)}
                                >
                                    <Pencil className="size-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    destructive
                                    onSelect={() => setDeleting(task)}
                                >
                                    <Trash2 className="size-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : null,
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load general tasks"
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
                title="General tasks"
                description="Tasks outside projects. They carry a monthly KPI weight."
                action={
                    canAssign ? (
                        <Button onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> Assign task
                        </Button>
                    ) : null
                }
            />
            <GeneralTabs />
            {data ? (
                <Card
                    variant="tinted"
                    className="flex flex-wrap items-center justify-between gap-3"
                >
                    <p className="text-sm text-slate-700">
                        Monthly weight:{' '}
                        <span className="font-bold text-slate-900">
                            {data.monthly_weight}%
                        </span>
                    </p>
                    {can('general-tasks.settings.update') ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setWeightOpen(true)}
                        >
                            Change weight
                        </Button>
                    ) : null}
                </Card>
            ) : null}
            <FilterBar
                activeCount={
                    Number(Boolean(developerId)) + Number(Boolean(status))
                }
                onReset={() => set({ developer_id: null, status: null })}
            >
                <MonthField
                    value={month}
                    onChange={(value) => set({ month: value })}
                />
                <Field label="Employee" className="lg:w-52">
                    <Select
                        density="compact"
                        value={developerId || 'all'}
                        onValueChange={(value) =>
                            set({
                                developer_id: value === 'all' ? null : value,
                            })
                        }
                        options={[
                            { value: 'all', label: 'All employees' },
                            ...(data?.developers ?? []).map((person) => ({
                                value: String(person.id),
                                label: `${person.name} (${person.developer_code})`,
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
                            { value: 'all', label: 'Any' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'overdue', label: 'Overdue' },
                        ]}
                    />
                </Field>
            </FilterBar>
            <DataTable
                columns={columns}
                rows={data?.tasks}
                rowKey={(task) => task.id}
                loading={isLoading}
                emptyTitle="No general tasks for these filters"
            />

            <Drawer
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DrawerContent
                    title={editing === 'new' ? 'Assign a task' : 'Edit task'}
                >
                    {editing ? (
                        <TaskForm
                            key={editing === 'new' ? 'new' : editing.id}
                            task={editing === 'new' ? null : editing}
                            people={data?.developers ?? []}
                            onDone={() => setEditing(null)}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>

            <Modal open={weightOpen} onOpenChange={setWeightOpen}>
                {weightOpen && data ? (
                    <WeightForm
                        initial={data.monthly_weight}
                        onDone={() => setWeightOpen(false)}
                    />
                ) : null}
            </Modal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete task?"
                description={
                    deleting ? `"${deleting.title}" will be removed.` : ''
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

function TaskForm({
    task,
    people,
    onDone,
}: {
    task: AdminGeneralTask | null;
    people: Person[];
    onDone: () => void;
}) {
    const [save, { isLoading }] = useSaveGeneralTaskMutation();
    const [title, setTitle] = useState(task?.title ?? '');
    const [description, setDescription] = useState(task?.description ?? '');
    const [assignee, setAssignee] = useState(String(task?.assignee?.id ?? ''));
    const [priority, setPriority] = useState<string>(
        task?.priority ?? 'normal',
    );
    const [deadline, setDeadline] = useState(task?.deadline ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={async (event) => {
                event.preventDefault();

                try {
                    await save({
                        id: task?.id,
                        title,
                        description: description || null,
                        assigned_developer_id: Number(assignee),
                        priority: priority as Priority,
                        deadline,
                    }).unwrap();
                    toast.success(task ? 'Task updated.' : 'Task assigned.');
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
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <Field label="Title" required error={errors.title}>
                    <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                </Field>
                <Field label="Description" error={errors.description}>
                    <Textarea
                        rows={3}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </Field>
                <Field
                    label="Assign to"
                    required
                    error={errors.assigned_developer_id}
                >
                    <Select
                        value={assignee}
                        onValueChange={setAssignee}
                        placeholder="Choose an employee"
                        options={people.map((person) => ({
                            value: String(person.id),
                            label: `${person.name} (${person.developer_code})`,
                        }))}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Priority" error={errors.priority}>
                        <Select
                            value={priority}
                            onValueChange={setPriority}
                            options={PRIORITIES}
                        />
                    </Field>
                    <Field label="Deadline" required error={errors.deadline}>
                        <Input
                            type="date"
                            value={deadline}
                            onChange={(event) =>
                                setDeadline(event.target.value)
                            }
                        />
                    </Field>
                </div>
            </div>
            <div className="border-t border-slate-100 p-4">
                <Button type="submit" block loading={isLoading}>
                    {task ? 'Save task' : 'Assign task'}
                </Button>
            </div>
        </form>
    );
}

function WeightForm({
    initial,
    onDone,
}: {
    initial: number;
    onDone: () => void;
}) {
    const [save, { isLoading }] = useSetGeneralWeightMutation();
    const [value, setValue] = useState(String(initial));
    const [error, setError] = useState<string | undefined>();

    return (
        <ModalContent
            title="Monthly weight"
            description="Share of the monthly KPI that general tasks carry."
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="general-weight"
                        loading={isLoading}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <form
                id="general-weight"
                className="pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        await save({ monthly_weight: Number(value) }).unwrap();
                        toast.success('Monthly weight updated.');
                        onDone();
                    } catch (e) {
                        setError(
                            fieldErrors(e).monthly_weight ?? errorMessage(e),
                        );
                    }
                }}
            >
                <Field label="Weight (%)" required error={error}>
                    <Input
                        type="number"
                        min={1}
                        max={100}
                        step="0.01"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                    />
                </Field>
            </form>
        </ModalContent>
    );
}
