import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { errorMessage } from '@/api/baseApi';
import type { AdminProjectDetail, AdminTask } from '@/api/admin-detail-types';
import {
    useCreateAdminTaskMutation,
    useDeleteAdminTaskMutation,
    useSetAdminTaskAssigneeMutation,
    useSetAdminTaskStatusPriorityMutation,
} from '@/api/endpoints/adminProjectDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormMessage } from '@/features/auth/AuthCard';
import { priorityOptions } from '@/features/employee/workspace/constants';
import { SectionHeader } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';
import { applyServerErrors } from '@/lib/forms';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
];

export function AdminTasksPanel({
    detail,
    locked,
}: {
    detail: AdminProjectDetail;
    locked: boolean;
}) {
    const { t } = usePhaseLabel();
    const { can } = usePermissions();
    const run = useRun();
    const projectId = detail.project.id;
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<AdminTask | null>(null);
    const [setStatusPriority] = useSetAdminTaskStatusPriorityMutation();
    const [setAssignee] = useSetAdminTaskAssigneeMutation();
    const [remove, { isLoading: removing }] = useDeleteAdminTaskMutation();
    const editable = can('project-tasks.update') && !locked;
    const team = detail.project.assigned_developers;
    const tasks = useMemo(() => {
        const term = search.trim().toLowerCase();

        return detail.tasks.filter(
            (task) =>
                (status === 'all' || task.status === status) &&
                (priority === 'all' ||
                    (task.priority ?? 'none') === priority) &&
                (term === '' ||
                    `${task.task_code ?? ''} ${task.title}`
                        .toLowerCase()
                        .includes(term)),
        );
    }, [detail.tasks, search, status, priority]);

    const columns: Column<AdminTask>[] = [
        {
            key: 'task',
            header: 'Task',
            primary: true,
            cell: (task) => (
                <div className="min-w-0">
                    <p className="font-bold text-slate-900">{task.title}</p>
                    {task.task_code ? (
                        <p className="text-xs font-normal text-slate-400">
                            {task.task_code}
                        </p>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (task) =>
                editable ? (
                    <Select
                        density="compact"
                        className="h-9 min-h-9 w-full text-xs md:w-36"
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onValueChange={(value) =>
                            void run(
                                setStatusPriority({
                                    projectId,
                                    taskId: task.id,
                                    status: value,
                                }),
                                '',
                            )
                        }
                        options={statusOptions}
                    />
                ) : (
                    <Badge className="capitalize">
                        {task.status.replace('_', ' ')}
                    </Badge>
                ),
        },
        {
            key: 'priority',
            header: 'Priority',
            cell: (task) =>
                editable ? (
                    <Select
                        density="compact"
                        className="h-9 min-h-9 w-full text-xs md:w-32"
                        aria-label={`Priority for ${task.title}`}
                        value={task.priority ?? 'none'}
                        onValueChange={(value) =>
                            void run(
                                setStatusPriority({
                                    projectId,
                                    taskId: task.id,
                                    priority: value === 'none' ? null : value,
                                }),
                                '',
                            )
                        }
                        options={priorityOptions}
                    />
                ) : (
                    <span className="text-xs capitalize">
                        {task.priority ?? '-'}
                    </span>
                ),
        },
        {
            key: 'assignee',
            header: 'Assignee',
            cell: (task) =>
                editable ? (
                    <Select
                        density="compact"
                        className="h-9 min-h-9 w-full text-xs md:w-40"
                        aria-label={`Assignee for ${task.title}`}
                        value={
                            task.assigned_developer?.id
                                ? String(task.assigned_developer.id)
                                : 'none'
                        }
                        onValueChange={(value) =>
                            void run(
                                setAssignee({
                                    projectId,
                                    taskId: task.id,
                                    assigned_developer_id:
                                        value === 'none' ? null : Number(value),
                                }),
                                '',
                            )
                        }
                        options={[
                            { value: 'none', label: 'Unassigned' },
                            ...team.map((developer) => ({
                                value: String(developer.id),
                                label: developer.name,
                            })),
                        ]}
                    />
                ) : (
                    <span className="text-xs">
                        {task.assigned_developer?.name ?? 'Unassigned'}
                    </span>
                ),
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (task) =>
                editable ? (
                    <Input
                        key={`${task.id}-${task.deadline ?? ''}`}
                        type="date"
                        density="compact"
                        className="h-9 min-h-9 w-full text-xs md:w-36"
                        aria-label={`Deadline for ${task.title}`}
                        defaultValue={task.deadline?.slice(0, 10) ?? ''}
                        onChange={(event) =>
                            void run(
                                setStatusPriority({
                                    projectId,
                                    taskId: task.id,
                                    deadline: event.target.value || null,
                                }),
                                '',
                            )
                        }
                    />
                ) : (
                    <span className="text-xs">{formatDate(task.deadline)}</span>
                ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (task) =>
                can('project-tasks.delete') && !locked ? (
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
                                destructive
                                onSelect={() => setDeleting(task)}
                            >
                                <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null,
        },
    ];

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Tasks"
                description={
                    locked
                        ? t('This phase is completed, tasks are read only.')
                        : `${detail.tasks.length} task(s) in this view`
                }
                action={
                    <div className="flex flex-wrap gap-2">
                        {can('project-tasks.create') && !locked ? (
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    to={`/admin/projects/${projectId}/tasks/bulk-upload`}
                                >
                                    <Upload className="size-4" /> Bulk upload
                                </Link>
                            </Button>
                        ) : null}
                        {can('project-tasks.create') && !locked ? (
                            <Button size="sm" onClick={() => setCreating(true)}>
                                <Plus className="size-4" /> New task
                            </Button>
                        ) : null}
                    </div>
                }
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                    density="compact"
                    className="sm:w-44"
                    aria-label="Status filter"
                    value={status}
                    onValueChange={setStatus}
                    options={[
                        { value: 'all', label: 'Any status' },
                        ...statusOptions,
                    ]}
                />
                <Select
                    density="compact"
                    className="sm:w-44"
                    aria-label="Priority filter"
                    value={priority}
                    onValueChange={setPriority}
                    options={[
                        { value: 'all', label: 'Any priority' },
                        ...priorityOptions,
                    ]}
                />
                <div className="relative sm:ml-auto sm:w-64">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        aria-label="Search tasks"
                        placeholder="Search tasks"
                        density="compact"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>
            <DataTable
                columns={columns}
                rows={tasks}
                rowKey={(task) => task.id}
                emptyTitle={
                    search || status !== 'all' || priority !== 'all'
                        ? 'No task matches these filters'
                        : 'No tasks yet'
                }
            />

            <NewTaskDrawer
                detail={detail}
                open={creating}
                onClose={() => setCreating(false)}
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete task?"
                description={
                    deleting ? `"${deleting.title}" moves to Restore.` : ''
                }
                confirmLabel="Delete"
                loading={removing}
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(remove({ projectId, taskId: deleting.id })))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

const schema = z.object({
    title: z.string().trim().min(1, 'Enter a title.').max(255),
    description: z.string(),
    milestone_id: z.string().min(1, 'Choose a milestone.'),
    estimated_hours: z.coerce
        .number()
        .min(0.01, 'Enter the estimated hours.')
        .max(10000),
    weight: z.coerce.number().min(0.01, 'Enter the weight.').max(100),
    deadline: z.string(),
    assigned_developer_id: z.string(),
});
type Values = z.infer<typeof schema>;

function NewTaskDrawer({
    detail,
    open,
    onClose,
}: {
    detail: AdminProjectDetail;
    open: boolean;
    onClose: () => void;
}) {
    return (
        <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
            {open ? (
                <DrawerContent title="New task">
                    <NewTaskForm detail={detail} onClose={onClose} />
                </DrawerContent>
            ) : null}
        </Drawer>
    );
}

function NewTaskForm({
    detail,
    onClose,
}: {
    detail: AdminProjectDetail;
    onClose: () => void;
}) {
    const [create, { isLoading }] = useCreateAdminTaskMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<Values>({
        resolver: zodResolver(schema) as unknown as Resolver<Values>,
        defaultValues: {
            title: '',
            description: '',
            milestone_id: String(detail.milestones[0]?.id ?? ''),
            estimated_hours: 1,
            weight: 1,
            deadline: '',
            assigned_developer_id: '',
        },
    });

    const onSubmit = async (values: Values) => {
        setFormError(null);

        try {
            const result = await create({
                projectId: detail.project.id,
                body: {
                    title: values.title,
                    description: values.description || null,
                    milestone_id: Number(values.milestone_id),
                    estimated_hours: values.estimated_hours,
                    weight: values.weight,
                    deadline: values.deadline || null,
                    assigned_developer_id: values.assigned_developer_id
                        ? Number(values.assigned_developer_id)
                        : null,
                    project_phase_id: detail.selected_phase_id,
                },
            }).unwrap();
            toast.success(result.message);
            onClose();
        } catch (error) {
            setFormError(
                applyServerErrors(error, setError, [
                    'title',
                    'description',
                    'milestone_id',
                    'estimated_hours',
                    'weight',
                    'deadline',
                    'assigned_developer_id',
                ]) ?? errorMessage(error),
            );
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex min-h-full flex-col"
        >
            <div className="flex-1 space-y-4 p-5">
                <FormMessage>{formError}</FormMessage>
                <Field label="Title" required error={errors.title?.message}>
                    <Input autoFocus {...register('title')} />
                </Field>
                <Field
                    label="Milestone"
                    required
                    error={errors.milestone_id?.message}
                >
                    <Controller
                        control={control}
                        name="milestone_id"
                        render={({ field }) => (
                            <Select
                                value={field.value || undefined}
                                onValueChange={field.onChange}
                                placeholder="Choose a milestone"
                                options={detail.milestones.map((milestone) => ({
                                    value: String(milestone.id),
                                    label: milestone.name,
                                }))}
                            />
                        )}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field
                        label="Estimated hours"
                        required
                        error={errors.estimated_hours?.message}
                    >
                        <Input
                            type="number"
                            step="0.25"
                            inputMode="decimal"
                            {...register('estimated_hours')}
                        />
                    </Field>
                    <Field
                        label="Weight (%)"
                        required
                        error={errors.weight?.message}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            {...register('weight')}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Deadline" error={errors.deadline?.message}>
                        <Input type="date" {...register('deadline')} />
                    </Field>
                    <Field
                        label="Assign to"
                        error={errors.assigned_developer_id?.message}
                    >
                        <Controller
                            control={control}
                            name="assigned_developer_id"
                            render={({ field }) => (
                                <Select
                                    value={field.value || 'none'}
                                    onValueChange={(value) =>
                                        field.onChange(
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                    options={[
                                        { value: 'none', label: 'Unassigned' },
                                        ...detail.project.assigned_developers.map(
                                            (developer) => ({
                                                value: String(developer.id),
                                                label: developer.name,
                                            }),
                                        ),
                                    ]}
                                />
                            )}
                        />
                    </Field>
                </div>
                <Field label="Description" error={errors.description?.message}>
                    <Textarea rows={4} {...register('description')} />
                </Field>
            </div>
            <div className="pb-safe sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-surface p-4 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    loading={isLoading}
                    className="w-full sm:w-auto"
                >
                    Create task
                </Button>
            </div>
        </form>
    );
}
