import {
    CheckCircle2,
    Flag,
    Pencil,
    RotateCcw,
    Search,
    Trash2,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { MyOngoingTask } from '@/api/ongoing-types';
import { formatMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';

import { FilterSelect } from './TaskTable';
import {
    initials,
    PRIORITY_LABEL,
    PRIORITY_STYLE,
    selectClass,
} from './taskTableStyles';

const small =
    'inline-flex size-6 items-center justify-center rounded-md border transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

interface Props {
    tasks: MyOngoingTask[];
    today: string;
    canEdit: boolean;
    canDelete: boolean;
    canWork: boolean;
    onDone: (task: MyOngoingTask) => void;
    onReopen: (task: MyOngoingTask) => void;
    onEdit: (task: MyOngoingTask) => void;
    onRemove: (task: MyOngoingTask) => void;
}

/**
 * The ongoing tasks in the same table the project's task list uses: filters and a count above,
 * one row per task, colored priority and status pills, and small action buttons.
 */
export function OngoingTaskTable({
    tasks,
    today,
    canEdit,
    canDelete,
    canWork,
    onDone,
    onReopen,
    onEdit,
    onRemove,
}: Props) {
    const [search, setSearch] = useState('');
    const [priority, setPriority] = useState('');
    const [status, setStatus] = useState('');

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const state =
                task.status === 'completed'
                    ? 'completed'
                    : task.is_missed
                      ? 'missed'
                      : 'pending';

            return (
                (priority === '' || (task.priority ?? 'none') === priority) &&
                (status === '' || state === status) &&
                (term === '' || task.title.toLowerCase().includes(term))
            );
        });
    }, [tasks, search, priority, status]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <FilterSelect
                        label="Filter tasks by priority"
                        value={priority}
                        onChange={setPriority}
                        width="w-32"
                        options={[
                            { value: '', label: 'All priorities' },
                            { value: 'urgent', label: 'Urgent' },
                            { value: 'high', label: 'High' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'low', label: 'Low' },
                            { value: 'none', label: 'No priority' },
                        ]}
                    />
                    <FilterSelect
                        label="Filter tasks by status"
                        value={status}
                        onChange={setStatus}
                        width="w-32"
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'missed', label: 'Missed' },
                        ]}
                    />
                    <span className="text-[11px] whitespace-nowrap text-slate-500">
                        {shown.length} of {tasks.length} tasks
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="relative w-56">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search task name..."
                            aria-label="Search tasks"
                            className={cn(selectClass, 'w-full pl-8')}
                        />
                    </label>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                            {[
                                '#',
                                'Task',
                                'Assignee',
                                'Created By',
                                'Priority',
                                'Time',
                                'Deadline',
                                'Status',
                                'Actions',
                            ].map((label) => (
                                <th
                                    key={label}
                                    className="px-3 py-2.5 font-medium"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {shown.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-3 py-8 text-center text-sm text-slate-500"
                                >
                                    No tasks match these filters
                                </td>
                            </tr>
                        ) : (
                            shown.map((task, index) => {
                                const done = task.status === 'completed';
                                const late =
                                    !done &&
                                    (task.is_missed ||
                                        (task.deadline !== null &&
                                            task.deadline < today));
                                const level = task.priority ?? 'none';
                                const own =
                                    task.created_by_me && !task.is_locked;

                                return (
                                    <tr
                                        key={task.id}
                                        className={cn(
                                            'text-slate-700',
                                            late && 'bg-rose-50/60',
                                        )}
                                    >
                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-500">
                                            {index + 1}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <p
                                                className={cn(
                                                    'font-medium text-slate-900',
                                                    done &&
                                                        'text-slate-500 line-through',
                                                )}
                                            >
                                                {task.title}
                                            </p>
                                            {task.description ? (
                                                <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                                                    {task.description}
                                                </p>
                                            ) : null}
                                            {task.carried_over ? (
                                                <span className="mt-0.5 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                                                    Carried over
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="inline-flex h-8 max-w-44 items-center gap-2 rounded-full border border-slate-200 bg-white pr-2.5 pl-1.5 text-xs font-medium text-slate-700">
                                                <span
                                                    className={cn(
                                                        'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                                        task.assignee
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500',
                                                    )}
                                                >
                                                    {task.assignee ? (
                                                        initials(
                                                            task.assignee.name,
                                                        )
                                                    ) : (
                                                        <User className="size-3" />
                                                    )}
                                                </span>
                                                <span className="truncate">
                                                    {task.assignee?.name ??
                                                        'Unassigned'}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-slate-600">
                                            {task.created_by ?? 'Unknown'}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span
                                                className={cn(
                                                    'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold',
                                                    PRIORITY_STYLE[level],
                                                )}
                                            >
                                                <Flag className="size-3.5" />
                                                {PRIORITY_LABEL[level]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-slate-600">
                                            {task.spent_minutes !== null ? (
                                                formatMinutes(
                                                    task.spent_minutes,
                                                )
                                            ) : (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs">
                                            {task.deadline ? (
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1 font-medium',
                                                        late
                                                            ? 'text-rose-600'
                                                            : 'text-slate-600',
                                                    )}
                                                >
                                                    {late ? (
                                                        <span className="inline-block size-1.5 rounded-full bg-rose-500" />
                                                    ) : null}
                                                    {task.deadline
                                                        .slice(0, 10)
                                                        .split('-')
                                                        .reverse()
                                                        .join('-')}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span
                                                className={cn(
                                                    'inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold',
                                                    done
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : task.is_missed
                                                          ? 'bg-rose-100 text-rose-700'
                                                          : 'bg-amber-100 text-amber-700',
                                                )}
                                            >
                                                {done
                                                    ? 'Completed'
                                                    : task.is_missed
                                                      ? 'Missed'
                                                      : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                {task.is_locked ? (
                                                    <span className="text-[11px] text-slate-400">
                                                        Month closed
                                                    </span>
                                                ) : canWork && done ? (
                                                    <button
                                                        type="button"
                                                        title="Reopen task"
                                                        aria-label={`Reopen ${task.title}`}
                                                        onClick={() =>
                                                            onReopen(task)
                                                        }
                                                        className={cn(
                                                            small,
                                                            'border-slate-300 text-slate-700',
                                                        )}
                                                    >
                                                        <RotateCcw className="size-3" />
                                                    </button>
                                                ) : canWork ? (
                                                    <button
                                                        type="button"
                                                        title="Mark done"
                                                        aria-label={`Mark done ${task.title}`}
                                                        onClick={() =>
                                                            onDone(task)
                                                        }
                                                        className={cn(
                                                            small,
                                                            'border-emerald-300 text-emerald-700',
                                                        )}
                                                    >
                                                        <CheckCircle2 className="size-3" />
                                                    </button>
                                                ) : null}
                                                {own && canEdit ? (
                                                    <button
                                                        type="button"
                                                        title="Edit task"
                                                        aria-label={`Edit ${task.title}`}
                                                        onClick={() =>
                                                            onEdit(task)
                                                        }
                                                        className={cn(
                                                            small,
                                                            'border-slate-300 text-slate-700',
                                                        )}
                                                    >
                                                        <Pencil className="size-3" />
                                                    </button>
                                                ) : null}
                                                {own && canDelete ? (
                                                    <button
                                                        type="button"
                                                        title="Delete task"
                                                        aria-label={`Delete ${task.title}`}
                                                        onClick={() =>
                                                            onRemove(task)
                                                        }
                                                        className={cn(
                                                            small,
                                                            'border-rose-300 text-rose-700',
                                                        )}
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
