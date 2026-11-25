import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import {
    useGetMyGeneralTasksQuery,
    useSetTaskStatusMutation,
} from '@/api/endpoints/employee';
import type { GeneralTask, Priority } from '@/api/employee-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { formatDate } from '@/lib/date';
import { formatMinutes } from '@/lib/time';

import { CompleteTaskDialog } from './components/CompleteTaskDialog';

const priorityTone: Record<
    Priority,
    'danger' | 'warning' | 'neutral' | 'info'
> = {
    urgent: 'danger',
    high: 'warning',
    normal: 'neutral',
    low: 'info',
};

export function MyGeneralTasksPage() {
    const [month, setMonth] = useState('');
    const { data, isLoading, isError, refetch } = useGetMyGeneralTasksQuery(
        month ? { month } : undefined,
    );
    const [setStatus, { isLoading: saving }] = useSetTaskStatusMutation();
    const [completing, setCompleting] = useState<GeneralTask | null>(null);
    const [reopening, setReopening] = useState<GeneralTask | null>(null);

    const groups = useMemo(() => {
        const tasks = data?.tasks ?? [];
        const today = data?.today ?? '';
        const open = tasks.filter((task) => task.status !== 'completed');

        return [
            {
                key: 'overdue',
                title: 'Overdue',
                tone: 'text-red-700',
                tasks: open.filter(
                    (task) => task.deadline !== null && task.deadline < today,
                ),
            },
            {
                key: 'today',
                title: 'Due today',
                tone: 'text-amber-700',
                tasks: open.filter((task) => task.deadline === today),
            },
            {
                key: 'upcoming',
                title: 'Upcoming',
                tone: 'text-slate-700',
                tasks: open.filter(
                    (task) => task.deadline !== null && task.deadline > today,
                ),
            },
            {
                key: 'done',
                title: 'Completed',
                tone: 'text-emerald-700',
                tasks: tasks.filter((task) => task.status === 'completed'),
            },
        ].filter((group) => group.tasks.length > 0);
    }, [data]);

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
                title="Could not load your general tasks"
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

    const summary = data?.summary;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                        My general tasks
                    </h1>
                    <p className="mt-1 max-w-xl text-sm text-slate-500">
                        Tasks given outside your projects. Mark them done with
                        the time you spent; they appear in your daily report
                        automatically.
                    </p>
                </div>
                <Field label="Month" className="sm:w-48">
                    <Input
                        type="month"
                        value={month || data?.month || ''}
                        onChange={(event) => setMonth(event.target.value)}
                        density="compact"
                    />
                </Field>
            </div>

            {summary ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <StatCard label="Assigned" value={summary.assigned} />
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
                        label="Completed late"
                        value={summary.late}
                        delay={180}
                    />
                    <StatCard
                        label="KPI this month"
                        value={
                            summary.awarded_kpi_percentage === null
                                ? '—'
                                : `${summary.awarded_kpi_percentage} / ${data!.monthly_weight}`
                        }
                        hint={
                            summary.awarded_kpi_percentage === null
                                ? 'Final after month close'
                                : undefined
                        }
                        highlight
                        delay={240}
                    />
                </div>
            ) : null}

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-20 rounded-2xl" />
                    ))}
                </div>
            ) : groups.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No general tasks for this month" />
                </Card>
            ) : (
                groups.map((group) => (
                    <section key={group.key} className="space-y-3">
                        <h2
                            className={`text-xs font-bold tracking-wide uppercase ${group.tone}`}
                        >
                            {group.title} ({group.tasks.length})
                        </h2>
                        <ul className="space-y-3">
                            {group.tasks.map((task) => (
                                <li key={task.id}>
                                    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {task.title}
                                                </p>
                                                {task.priority ? (
                                                    <Badge
                                                        tone={
                                                            priorityTone[
                                                                task.priority
                                                            ]
                                                        }
                                                        className="capitalize"
                                                    >
                                                        {task.priority}
                                                    </Badge>
                                                ) : null}
                                                {task.is_overdue ? (
                                                    <Badge tone="danger">
                                                        Overdue
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            {task.description ? (
                                                <p className="text-xs text-slate-500">
                                                    {task.description}
                                                </p>
                                            ) : null}
                                            <p className="text-xs text-slate-500">
                                                Due {formatDate(task.deadline)}
                                                {task.assigned_by
                                                    ? ` · Assigned by ${task.assigned_by}`
                                                    : ''}
                                                {task.completed_at
                                                    ? ` · Completed ${formatDate(task.completed_at)}`
                                                    : ''}
                                                {task.spent_minutes !== null
                                                    ? ` · ${formatMinutes(task.spent_minutes)}`
                                                    : ''}
                                            </p>
                                        </div>
                                        {task.is_locked ? (
                                            <Badge>Locked</Badge>
                                        ) : task.status === 'completed' ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setReopening(task)
                                                }
                                            >
                                                <RotateCcw className="size-4" />{' '}
                                                Reopen
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setCompleting(task)
                                                }
                                            >
                                                <CheckCircle2 className="size-4" />{' '}
                                                Mark done
                                            </Button>
                                        )}
                                    </Card>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))
            )}

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
