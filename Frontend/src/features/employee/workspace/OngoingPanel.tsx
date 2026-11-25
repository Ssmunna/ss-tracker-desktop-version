import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import { useAppSelector } from '@/app/hooks';
import { useSetTaskStatusMutation } from '@/api/endpoints/employee';
import {
    useDeleteMyOngoingTaskMutation,
    useGetProjectOngoingTasksQuery,
    useToggleOngoingFeatureMutation,
} from '@/api/endpoints/ongoingTasks';
import type { MyOngoingTask } from '@/api/ongoing-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Switch } from '@/components/ui/switch';
import { selectMe } from '@/features/auth/authSlice';
import { TaskForm } from '@/features/ongoing/TaskForm';
import { usePermissions } from '@/hooks/usePermissions';

import { CompleteTaskDialog } from '../components/CompleteTaskDialog';
import { OngoingTaskTable } from './OngoingTaskTable';

/**
 * The Ongoing tab of a project: continuous work (fixes, requests, support) kept apart from the
 * project's phases. Employees on the ongoing team work their own tasks here; employees with
 * the permission also switch the feature on and off for the project.
 */
export function OngoingPanel({ projectId }: { projectId: number }) {
    const { can } = usePermissions();
    const canToggle = can('employee-projects.ongoing.toggle');
    const [month, setMonth] = useState('');
    const { data, isLoading, isError, refetch } =
        useGetProjectOngoingTasksQuery({
            projectId,
            month: month || undefined,
        });
    const [toggle, { isLoading: toggling }] = useToggleOngoingFeatureMutation();
    const [setStatus, { isLoading: saving }] = useSetTaskStatusMutation();
    const [completing, setCompleting] = useState<MyOngoingTask | null>(null);
    const [reopening, setReopening] = useState<MyOngoingTask | null>(null);
    const [editing, setEditing] = useState<MyOngoingTask | 'new' | null>(null);
    const [deleting, setDeleting] = useState<MyOngoingTask | null>(null);
    const [remove, { isLoading: removing }] = useDeleteMyOngoingTaskMutation();
    const me = useAppSelector(selectMe);
    const canCreate = can('employee-projects.tasks.create');
    const canEdit = can('employee-projects.tasks.update');
    const canDelete = can('employee-projects.tasks.delete');

    const run = async (
        action: Promise<{ message: string }>,
        onDone: () => void,
    ) => {
        try {
            const result = await action;
            toast.success(result.message);
            onDone();
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    if (isError) {
        return (
            <ErrorState
                title="Could not load ongoing tasks"
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

    if (isLoading || !data) {
        return <Skeleton className="h-48 rounded-2xl" />;
    }

    const summary = data.summary;

    return (
        <div className="space-y-4">
            {canToggle ? (
                <Card
                    variant="tinted"
                    className="flex flex-wrap items-center justify-between gap-3"
                >
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-900">
                            Ongoing tasks
                        </p>
                        <p className="text-xs text-slate-600">
                            Continuous work for this project, kept apart from
                            its phases.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-700">
                            {data.enabled ? 'On' : 'Off'}
                        </span>
                        <Switch
                            aria-label="Ongoing tasks"
                            checked={data.enabled}
                            disabled={toggling}
                            onCheckedChange={async (enabled) => {
                                try {
                                    await toggle({
                                        projectId,
                                        enabled,
                                    }).unwrap();
                                    toast.success(
                                        enabled
                                            ? 'Ongoing tasks switched on.'
                                            : 'Ongoing tasks switched off.',
                                    );
                                } catch (error) {
                                    toast.error(errorMessage(error));
                                }
                            }}
                        />
                    </div>
                </Card>
            ) : null}

            {!data.is_member ? (
                <Card variant="flush">
                    <EmptyState
                        title="You are not on this project's ongoing team"
                        description="Ask a manager to add you to see its ongoing tasks."
                    />
                </Card>
            ) : (
                <>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <p className="max-w-xl text-sm text-slate-500">
                            Mark a task done with the time you spent; it appears
                            in your daily report. Each month is scored on its
                            own, and what is not finished by month end counts as
                            missed.
                        </p>
                        <div className="flex flex-wrap items-end gap-3">
                            {canCreate && data.enabled ? (
                                <Button onClick={() => setEditing('new')}>
                                    <Plus className="size-4" /> Add task
                                </Button>
                            ) : null}
                            <Field label="Month" className="sm:w-48">
                                <Input
                                    type="month"
                                    value={month || data.month}
                                    onChange={(event) =>
                                        setMonth(event.target.value)
                                    }
                                    density="compact"
                                />
                            </Field>
                        </div>
                    </div>

                    {!data.enabled ? (
                        <Badge tone="warning">
                            Switched off: finish what is open
                        </Badge>
                    ) : null}

                    {summary ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatCard
                                label="Assigned"
                                value={summary.assigned}
                            />
                            <StatCard
                                label="Completed"
                                value={summary.completed}
                                delay={60}
                            />
                            <StatCard
                                label="Missed"
                                value={summary.missed}
                                delay={120}
                            />
                            <StatCard
                                label="KPI this month"
                                value={
                                    summary.awarded_kpi_percentage === null
                                        ? '—'
                                        : `${summary.awarded_kpi_percentage} / ${data.monthly_weight}`
                                }
                                hint={
                                    summary.awarded_kpi_percentage === null
                                        ? 'Final after month close'
                                        : undefined
                                }
                                highlight
                                delay={180}
                            />
                        </div>
                    ) : null}

                    {data.tasks.length === 0 ? (
                        <Card variant="flush">
                            <EmptyState title="No ongoing tasks this month" />
                        </Card>
                    ) : (
                        <OngoingTaskTable
                            tasks={data.tasks}
                            today={data.today}
                            canWork={can('employee-projects.tasks.toggle')}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onDone={setCompleting}
                            onReopen={setReopening}
                            onEdit={setEditing}
                            onRemove={setDeleting}
                        />
                    )}
                </>
            )}

            <Drawer
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DrawerContent
                    title={
                        editing === 'new' ? 'Add an ongoing task' : 'Edit task'
                    }
                >
                    {editing ? (
                        <TaskForm
                            key={editing === 'new' ? 'new' : editing.id}
                            scope="mine"
                            projectId={projectId}
                            task={editing === 'new' ? null : editing}
                            people={data.members}
                            defaultAssignee={String(me?.developer?.id ?? '')}
                            onDone={() => setEditing(null)}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete task?"
                description={
                    deleting ? `"${deleting.title}" will be removed.` : ''
                }
                confirmLabel="Delete"
                loading={removing}
                onConfirm={() =>
                    deleting &&
                    run(remove(deleting.id).unwrap(), () => setDeleting(null))
                }
            />
            <CompleteTaskDialog
                taskTitle={completing?.title ?? null}
                loading={saving}
                onClose={() => setCompleting(null)}
                onSubmit={(timeEntry) =>
                    completing &&
                    run(
                        setStatus({
                            taskId: completing.id,
                            status: 'completed',
                            time_entry: timeEntry,
                        }).unwrap(),
                        () => setCompleting(null),
                    )
                }
            />
            <ConfirmDialog
                open={reopening !== null}
                onOpenChange={(open) => !open && setReopening(null)}
                title="Reopen task?"
                description={
                    reopening
                        ? `"${reopening.title}" will go back to your open tasks.`
                        : ''
                }
                confirmLabel="Reopen"
                loading={saving}
                onConfirm={() =>
                    reopening &&
                    run(
                        setStatus({
                            taskId: reopening.id,
                            status: 'pending',
                        }).unwrap(),
                        () => setReopening(null),
                    )
                }
            />
        </div>
    );
}
