import { Check, GripVertical, Paperclip, User } from 'lucide-react';
import { useState } from 'react';

import type { Priority } from '@/api/employee-types';
import type { ProjectDetail, TaskItem, TaskStatus } from '@/api/project-types';
import { formatDate } from '@/lib/date';
import { formatMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';

import { PriorityBadge } from './shared';
import { TaskDetailsDialog } from './TaskDetailsDialog';

const COLUMNS: Array<{
    key: TaskStatus;
    label: string;
    box: string;
    over: string;
    title: string;
    count: string;
}> = [
    {
        key: 'pending',
        label: 'Pending',
        box: 'border-slate-200 bg-slate-50',
        over: 'border-slate-400 bg-slate-100',
        title: 'text-slate-600',
        count: 'bg-slate-200 text-slate-700',
    },
    {
        key: 'in_progress',
        label: 'In progress',
        box: 'border-blue-200 bg-blue-50/60',
        over: 'border-blue-400 bg-blue-100/70',
        title: 'text-blue-700',
        count: 'bg-blue-100 text-blue-700',
    },
    {
        key: 'completed',
        label: 'Completed',
        box: 'border-emerald-200 bg-emerald-50/60',
        over: 'border-emerald-400 bg-emerald-100/70',
        title: 'text-emerald-700',
        count: 'bg-emerald-100 text-emerald-700',
    },
];

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

const missed = (task: TaskItem) =>
    task.status !== 'completed' &&
    task.deadline !== null &&
    task.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10);

export interface BoardActions {
    /** Dragged into Pending or In progress. */
    setStatus: (task: TaskItem, status: 'pending' | 'in_progress') => void;
    /** Dragged into Completed: the time spent is asked first. */
    complete: (task: TaskItem) => void;
    /** Dropped on another card of the same column: put it before that card. */
    reorder: (task: TaskItem, before: TaskItem) => void;
    priority: (task: TaskItem, priority: Priority | null) => void;
    assign: (task: TaskItem, developerId: number | null) => void;
    edit: (task: TaskItem) => void;
    remove: (task: TaskItem) => void;
}

/** Three status columns. Cards drag between them (when the viewer may change status) and open a details dialog. */
export function TaskBoard({
    tasks,
    canToggle,
    canUpdate,
    canDelete,
    isOwner,
    team,
    actions,
}: {
    tasks: TaskItem[];
    canToggle: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    isOwner: boolean;
    team: ProjectDetail['project']['team_developers'];
    actions: BoardActions;
}) {
    const [dragging, setDragging] = useState<TaskItem | null>(null);
    const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
    const [overTask, setOverTask] = useState<number | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);
    // Each column shows its first cards and loads more on request, so a long board stays light.
    const [limits, setLimits] = useState<Record<string, number>>({});
    // Read from the live list, so a priority or assignee change shows at once.
    const open = tasks.find((task) => task.id === openId) ?? null;

    const clear = () => {
        setDragging(null);
        setOverColumn(null);
        setOverTask(null);
    };

    const dropOnColumn = (status: TaskStatus) => {
        const task = dragging;

        clear();

        if (!task || task.status === status || !canToggle) {
            return;
        }

        if (status === 'completed') {
            actions.complete(task);
        } else {
            actions.setStatus(task, status);
        }
    };

    const dropOnTask = (target: TaskItem) => {
        const task = dragging;

        clear();

        if (!task || task.id === target.id) {
            return;
        }

        if (task.status === target.status) {
            if (canUpdate) {
                actions.reorder(task, target);
            }

            return;
        }

        if (canToggle) {
            if (target.status === 'completed') {
                actions.complete(task);
            } else {
                actions.setStatus(task, target.status as 'pending');
            }
        }
    };

    return (
        <>
            <div className="grid gap-3 lg:grid-cols-3">
                {COLUMNS.map((column) => {
                    const all = tasks.filter(
                        (task) => task.status === column.key,
                    );
                    const limit = limits[column.key] ?? 30;
                    const items = all.slice(0, limit);

                    return (
                        <section
                            key={column.key}
                            aria-label={column.label}
                            onDragOver={(event) => {
                                if (dragging) {
                                    event.preventDefault();
                                    setOverColumn(column.key);
                                }
                            }}
                            onDragLeave={() => setOverColumn(null)}
                            onDrop={(event) => {
                                event.preventDefault();
                                dropOnColumn(column.key);
                            }}
                            className={cn(
                                'rounded-xl border p-2.5 transition-colors',
                                overColumn === column.key && dragging
                                    ? column.over
                                    : column.box,
                            )}
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <h3
                                    className={cn(
                                        'text-[11px] font-bold tracking-[0.14em] uppercase',
                                        column.title,
                                    )}
                                >
                                    {column.label}
                                </h3>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-xs font-bold',
                                        column.count,
                                    )}
                                >
                                    {all.length}
                                </span>
                            </div>
                            <ul className="max-h-[62vh] min-h-16 space-y-1.5 overflow-y-auto pr-0.5">
                                {items.map((task) => {
                                    const done = task.status === 'completed';

                                    return (
                                        <li
                                            key={task.id}
                                            draggable={canToggle || canUpdate}
                                            onDragStart={(event) => {
                                                event.dataTransfer.effectAllowed =
                                                    'move';
                                                setDragging(task);
                                            }}
                                            onDragEnd={clear}
                                            onDragOver={(event) => {
                                                if (dragging) {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    setOverColumn(column.key);
                                                    setOverTask(task.id);
                                                }
                                            }}
                                            onDrop={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                dropOnTask(task);
                                            }}
                                            onClick={() => setOpenId(task.id)}
                                            className={cn(
                                                'cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition',
                                                dragging?.id === task.id &&
                                                    'opacity-40',
                                                overTask === task.id &&
                                                    dragging?.id !== task.id &&
                                                    'ring-2 ring-indigo-400',
                                                missed(task) && 'bg-rose-50/70',
                                            )}
                                        >
                                            <div className="flex items-start gap-2">
                                                {canToggle || canUpdate ? (
                                                    <GripVertical className="mt-0.5 size-3.5 shrink-0 cursor-grab text-slate-400" />
                                                ) : null}
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex items-start gap-1.5">
                                                        <p
                                                            className={cn(
                                                                'min-w-0 flex-1 text-[13px] leading-snug font-semibold',
                                                                done
                                                                    ? 'text-slate-500 line-through'
                                                                    : 'text-slate-900',
                                                            )}
                                                        >
                                                            <span className="mr-1 text-slate-400">
                                                                {task.serial_no}
                                                                .
                                                            </span>
                                                            {task.title}
                                                        </p>
                                                        <span
                                                            title={
                                                                task
                                                                    .assigned_developer
                                                                    ?.name ??
                                                                'Unassigned'
                                                            }
                                                            className={cn(
                                                                'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                                                task.assigned_developer
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'border border-slate-200 text-slate-400',
                                                            )}
                                                        >
                                                            {task.assigned_developer ? (
                                                                initials(
                                                                    task
                                                                        .assigned_developer
                                                                        .name,
                                                                )
                                                            ) : (
                                                                <User className="size-3" />
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                                        <PriorityBadge
                                                            priority={
                                                                task.priority
                                                            }
                                                        />
                                                        {task.deadline ? (
                                                            <span
                                                                className={cn(
                                                                    missed(
                                                                        task,
                                                                    ) &&
                                                                        'font-bold text-rose-600',
                                                                )}
                                                            >
                                                                {missed(task)
                                                                    ? 'Missed '
                                                                    : 'Due '}
                                                                {formatDate(
                                                                    task.deadline,
                                                                )}
                                                            </span>
                                                        ) : null}
                                                        {task.attachments
                                                            .length > 0 ? (
                                                            <span className="inline-flex items-center gap-0.5">
                                                                <Paperclip className="size-3" />
                                                                {
                                                                    task
                                                                        .attachments
                                                                        .length
                                                                }
                                                            </span>
                                                        ) : null}
                                                        {done &&
                                                        task.my_completion_spent_minutes !==
                                                            null ? (
                                                            <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                                                <Check className="size-3" />
                                                                {formatMinutes(
                                                                    task.my_completion_spent_minutes,
                                                                )}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                                {all.length > limit ? (
                                    <li className="py-1 text-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setLimits((current) => ({
                                                    ...current,
                                                    [column.key]: limit + 30,
                                                }))
                                            }
                                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            Show more ({all.length - limit}{' '}
                                            left)
                                        </button>
                                    </li>
                                ) : null}
                                {items.length === 0 ? (
                                    <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
                                        Drop a task here
                                    </li>
                                ) : null}
                            </ul>
                        </section>
                    );
                })}
            </div>

            <TaskDetailsDialog
                task={open}
                onClose={() => setOpenId(null)}
                canUpdate={canUpdate}
                canDelete={canDelete}
                isOwner={isOwner}
                team={team}
                actions={actions}
            />
        </>
    );
}
